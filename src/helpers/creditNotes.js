const moment = require('moment');
const Boom = require('@hapi/boom');
const get = require('lodash/get');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const translate = require('./translate');
const Company = require('../models/Company');
const Event = require('../models/Event');
const BillingItem = require('../models/BillingItem');
const CreditNote = require('../models/CreditNote');
const CreditNoteNumber = require('../models/CreditNoteNumber');
const FundingHistory = require('../models/FundingHistory');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const SubscriptionsHelper = require('./subscriptions');
const BillSlipHelper = require('./billSlips');
const BillsHelper = require('./bills');
const { HOURLY, CIVILITY_LIST } = require('./constants');
const { COMPANI } = require('./constants');
const CreditNotePdf = require('../data/pdf/billing/creditNote');
const NumbersHelper = require('./numbers');

const { language } = translate;

exports.getCreditNotes = async (query, credentials) => {
  const { startDate, endDate, ...creditNoteQuery } = query;
  if (startDate || endDate) creditNoteQuery.date = UtilsHelper.getDateQuery({ startDate, endDate });
  creditNoteQuery.company = get(credentials, 'company._id', null);

  const creditNotes = await CreditNote.find(creditNoteQuery)
    .populate({
      path: 'customer',
      select: '_id identity subscriptions archivedAt',
      populate: { path: 'subscriptions.service' },
    })
    .populate({ path: 'thirdPartyPayer', select: '_id name' })
    .lean();

  return creditNotes.map(cn => ({
    ...cn,
    customer: SubscriptionsHelper.populateSubscriptionsServices({ ...cn.customer }),
  }));
};

exports.updateEventAndFundingHistory = async (eventsToUpdate, isBilled, credentials) => {
  const promises = [];
  const events = await Event
    .find({ _id: { $in: eventsToUpdate.map(ev => ev.eventId) }, company: get(credentials, 'company._id') })
    .lean();

  for (const event of events) {
    if (event.bills.thirdPartyPayer && event.bills.fundingId) {
      if (event.bills.nature !== HOURLY) {
        await FundingHistory.updateOne(
          { fundingId: event.bills.fundingId },
          { $inc: { amountTTC: isBilled ? event.bills.inclTaxesTpp : -event.bills.inclTaxesTpp } }
        );
      } else {
        const history = await FundingHistory.findOneAndUpdate(
          { fundingId: event.bills.fundingId, month: moment(event.startDate).format('MM/YYYY') },
          { $inc: { careHours: isBilled ? event.bills.careHours : -event.bills.careHours } }
        );
        if (!history) {
          await FundingHistory.updateOne(
            { fundingId: event.bills.fundingId },
            { $inc: { careHours: isBilled ? event.bills.careHours : -event.bills.careHours } }
          );
        }
      }
    }

    promises.push(Event.updateOne({ _id: event._id }, { isBilled }));
  }
  await Promise.all(promises);
};

exports.formatCreditNoteNumber = (companyPrefix, prefix, seq) =>
  `AV-${companyPrefix}${prefix}${seq.toString().padStart(5, '0')}`;

const formatBillingItemList = async (billingItemList) => {
  const bddBillingItemList = await BillingItem
    .find({ _id: { $in: billingItemList.map(bi => bi.billingItem) } }, { vat: 1, name: 1 })
    .lean();

  return billingItemList.map(bi => BillsHelper.formatBillingItem(bi, bddBillingItemList));
};

exports.formatCreditNote = async (payload, companyPrefix, prefix, seq) => {
  const creditNote = { ...payload, number: exports.formatCreditNoteNumber(companyPrefix, prefix, seq) };
  if (payload.inclTaxesCustomer) {
    creditNote.inclTaxesCustomer = UtilsHelper.getFixedNumber(payload.inclTaxesCustomer, 2);
  }

  if (payload.inclTaxesTpp) creditNote.inclTaxesTpp = UtilsHelper.getFixedNumber(payload.inclTaxesTpp, 2);

  if (get(payload, 'billingItemList.length')) {
    creditNote.billingItemList = await formatBillingItemList(payload.billingItemList);
  }

  return new CreditNote(creditNote);
};

exports.getCreditNoteNumber = async (payload, companyId) => {
  const prefix = moment(payload.date).format('MMYY');

  return CreditNoteNumber
    .findOneAndUpdate({ prefix, company: companyId }, {}, { new: true, upsert: true, setDefaultsOnInsert: true })
    .lean();
};

exports.createCreditNotes = async (payload, credentials) => {
  const { company } = credentials;
  const number = await exports.getCreditNoteNumber(payload, company._id);

  let tppCN;
  let customerCN;
  if (payload.inclTaxesTpp) {
    const tppPayload = { ...payload, exclTaxesCustomer: 0, inclTaxesCustomer: 0, company: company._id };
    tppCN = await exports.formatCreditNote(tppPayload, company.prefixNumber, number.prefix, number.seq);
    number.seq += 1;
  }
  if (payload.inclTaxesCustomer) {
    const customerPayload = {
      ...omit(payload, ['thirdPartyPayer']),
      exclTaxesTpp: 0,
      inclTaxesTpp: 0,
      company: company._id,
    };
    customerCN = await exports.formatCreditNote(customerPayload, company.prefixNumber, number.prefix, number.seq);
    number.seq += 1;
  }

  let creditNotes = [];
  const promises = [];
  if (tppCN && customerCN) {
    customerCN.linkedCreditNote = tppCN._id;
    tppCN.linkedCreditNote = customerCN._id;
    creditNotes = [customerCN, tppCN];
  } else if (tppCN) creditNotes = [tppCN];
  else creditNotes = [customerCN];

  if (payload.events) promises.push(exports.updateEventAndFundingHistory(payload.events, false, credentials));

  await Promise.all(promises);
  await CreditNote.insertMany(creditNotes);
  await CreditNoteNumber.updateOne({ prefix: number.prefix, company: company._id }, { $set: { seq: number.seq } });
  await BillSlipHelper.createBillSlips(creditNotes, payload.date, credentials.company);
};

exports.updateCreditNotes = async (creditNoteFromDB, payload, credentials) => {
  if (creditNoteFromDB.events) await exports.updateEventAndFundingHistory(creditNoteFromDB.events, true, credentials);

  let creditNote;
  if (!creditNoteFromDB.linkedCreditNote) {
    const payloadToSet = { ...payload };
    if (payload.billingItemList) payloadToSet.billingItemList = await formatBillingItemList(payload.billingItemList);
    creditNote = await CreditNote.findByIdAndUpdate(creditNoteFromDB._id, { $set: payloadToSet }, { new: true });
  } else {
    const tppPayload = { ...payload, inclTaxesCustomer: 0, exclTaxesCustomer: 0 };
    const customerPayload = { ...payload, inclTaxesTpp: 0, exclTaxesTpp: 0 };

    if (creditNoteFromDB.thirdPartyPayer) {
      creditNote = await CreditNote.findByIdAndUpdate(creditNoteFromDB._id, { $set: tppPayload }, { new: true });
      await CreditNote.updateOne({ _id: creditNoteFromDB.linkedCreditNote }, { $set: customerPayload }, { new: true });
    } else {
      creditNote = await CreditNote.findByIdAndUpdate(creditNoteFromDB._id, { $set: customerPayload }, { new: true });
      await CreditNote.updateOne({ _id: creditNoteFromDB.linkedCreditNote }, { $set: tppPayload }, { new: true });
    }
  }

  if (payload.events) await exports.updateEventAndFundingHistory(payload.events, false, credentials);

  return creditNote;
};

const formatEventForPdf = event => ({
  identity: `${event.auxiliary.identity.firstname.substring(0, 1)}. ${event.auxiliary.identity.lastname}`,
  date: moment(event.startDate).format('DD/MM'),
  startTime: moment(event.startDate).format('HH:mm'),
  endTime: moment(event.endDate).format('HH:mm'),
  service: event.serviceName,
  surcharges: event.bills.surcharges && PdfHelper.formatEventSurchargesForPdf(event.bills.surcharges),
});

const computeCreditNoteEventVat = (creditNote, event) => (creditNote.exclTaxesTpp
  ? event.bills.inclTaxesTpp - event.bills.exclTaxesTpp
  : event.bills.inclTaxesCustomer - event.bills.exclTaxesCustomer);

const formatBillingItemForPdf = billingItem => pick(
  billingItem,
  ['name', 'unitInclTaxes', 'vat', 'count', 'inclTaxes']
);

exports.formatPdf = (creditNote, company) => {
  const computedData = {
    totalVAT: 0,
    date: moment(creditNote.date).format('DD/MM/YYYY'),
    number: creditNote.number,
    forTpp: !!creditNote.thirdPartyPayer,
    recipient: {
      address: creditNote.thirdPartyPayer
        ? get(creditNote, 'thirdPartyPayer.address', {})
        : get(creditNote, 'customer.contact.primaryAddress', {}),
      name: creditNote.thirdPartyPayer
        ? creditNote.thirdPartyPayer.name
        : UtilsHelper.formatIdentity(creditNote.customer.identity, 'TFL'),
    },
    misc: creditNote.misc,
  };

  if (creditNote.events && creditNote.events.length > 0) {
    computedData.formattedEvents = [];
    const sortedEvents = creditNote.events.map(ev => ev).sort((ev1, ev2) => ev1.startDate - ev2.startDate);

    for (const event of sortedEvents) {
      computedData.formattedEvents.push(formatEventForPdf(event));
      computedData.totalVAT += computeCreditNoteEventVat(creditNote, event);
    }
  } else if (creditNote.subscription) {
    computedData.subscription = {
      service: creditNote.subscription.service.name,
      unitInclTaxes: UtilsHelper.formatPrice(creditNote.subscription.unitInclTaxes),
    };
  } else if (creditNote.billingItemList) {
    computedData.billingItems = [];
    for (const billingItem of creditNote.billingItemList) {
      computedData.billingItems.push(formatBillingItemForPdf(billingItem));
      computedData.totalVAT = NumbersHelper.oldAdd(
        computedData.totalVAT,
        NumbersHelper.subtract(billingItem.inclTaxes, billingItem.exclTaxes)
      );
    }
  }

  computedData.totalVAT = UtilsHelper.formatPrice(computedData.totalVAT);

  return {
    creditNote: {
      customer: {
        identity: { ...creditNote.customer.identity, title: CIVILITY_LIST[get(creditNote, 'customer.identity.title')] },
        contact: creditNote.customer.contact,
      },
      totalExclTaxes: creditNote.exclTaxesTpp
        ? UtilsHelper.formatPrice(creditNote.exclTaxesTpp)
        : UtilsHelper.formatPrice(creditNote.exclTaxesCustomer),
      netInclTaxes: creditNote.inclTaxesTpp
        ? UtilsHelper.formatPrice(creditNote.inclTaxesTpp)
        : UtilsHelper.formatPrice(creditNote.inclTaxesCustomer),
      ...computedData,
      company: pick(company, ['rcs', 'rna', 'address', 'logo', 'name']),
    },
  };
};

exports.removeCreditNote = async (creditNote, credentials, params) => {
  await exports.updateEventAndFundingHistory(creditNote.events, true, credentials);
  await CreditNote.deleteOne({ _id: params._id });
  if (creditNote.linkedCreditNote) await CreditNote.deleteOne({ _id: creditNote.linkedCreditNote });
};

exports.generateCreditNotePdf = async (params, credentials) => {
  const creditNote = await CreditNote.findOne({ _id: params._id })
    .populate({
      path: 'customer',
      select: '_id identity contact subscriptions',
      populate: { path: 'subscriptions.service' },
    })
    .populate({ path: 'thirdPartyPayer', select: '_id name address' })
    .populate({ path: 'events.auxiliary', select: 'identity' })
    .lean();

  if (!creditNote) throw Boom.notFound(translate[language].creditNoteNotFound);
  if (creditNote.origin !== COMPANI) throw Boom.badRequest(translate[language].creditNoteNotCompani);

  const company = await Company.findOne({ _id: get(credentials, 'company._id', null) }).lean();
  const data = exports.formatPdf(creditNote, company);
  const template = await CreditNotePdf.getPdfContent(data);
  const pdf = await PdfHelper.generatePdf(template);

  return { pdf, creditNoteNumber: creditNote.number };
};
