const moment = require('moment');
const Boom = require('boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const Company = require('../models/Company');
const Event = require('../models/Event');
const CreditNote = require('../models/CreditNote');
const CreditNoteNumber = require('../models/CreditNoteNumber');
const FundingHistory = require('../models/FundingHistory');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const SubscriptionsHelper = require('./subscriptions');
const { HOURLY, CIVILITY_LIST } = require('./constants');
const { COMPANI } = require('../helpers/constants');

const { language } = translate;

exports.getCreditNotes = async (query, credentials) => {
  const { startDate, endDate, ...creditNoteQuery } = query;
  if (startDate || endDate) creditNoteQuery.date = UtilsHelper.getDateQuery({ startDate, endDate });
  creditNoteQuery.company = get(credentials, 'company._id', null);

  const creditNotes = await CreditNote.find(creditNoteQuery)
    .populate({
      path: 'customer',
      select: '_id identity subscriptions',
      populate: { path: 'subscriptions.service' },
    })
    .populate({ path: 'thirdPartyPayer', select: '_id name' })
    .lean();

  for (let i = 0, l = creditNotes.length; i < l; i++) {
    creditNotes[i].customer = SubscriptionsHelper.populateSubscriptionsServices({ ...creditNotes[i].customer });
  }

  return creditNotes;
};

exports.updateEventAndFundingHistory = async (eventsToUpdate, isBilled, credentials) => {
  const promises = [];
  const events = await Event.find({
    _id: { $in: eventsToUpdate.map(ev => ev.eventId) },
    company: get(credentials, 'company._id', null),
  });
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

    event.isBilled = isBilled;
    promises.push(event.save());
  }
  await Promise.all(promises);
};

exports.formatCreditNoteNumber = (companyPrefix, prefix, seq) =>
  `AV-${companyPrefix}${prefix}${seq.toString().padStart(5, '0')}`;

exports.formatCreditNote = (payload, companyPrefix, prefix, seq) => {
  const creditNote = { ...payload, number: exports.formatCreditNoteNumber(companyPrefix, prefix, seq) };
  if (payload.inclTaxesCustomer) {
    creditNote.inclTaxesCustomer = UtilsHelper.getFixedNumber(payload.inclTaxesCustomer, 2);
  }
  if (payload.inclTaxesTpp) creditNote.inclTaxesTpp = UtilsHelper.getFixedNumber(payload.inclTaxesTpp, 2);

  return new CreditNote(creditNote);
};

exports.getCreditNoteNumber = async (payload, company) => {
  const prefix = moment(payload.date).format('MMYY');

  return CreditNoteNumber
    .findOneAndUpdate({ prefix, company: company._id }, {}, { new: true, upsert: true, setDefaultsOnInsert: true })
    .lean();
};

exports.createCreditNotes = async (payload, credentials) => {
  const { company } = credentials;
  const number = await exports.getCreditNoteNumber(payload, company);

  let tppCN;
  let customerCN;
  if (payload.inclTaxesTpp) {
    const tppPayload = { ...payload, exclTaxesCustomer: 0, inclTaxesCustomer: 0, company: company._id };
    tppCN = await exports.formatCreditNote(tppPayload, company.prefixNumber, number.prefix, number.seq);
    number.seq++;
  }
  if (payload.inclTaxesCustomer) {
    delete payload.thirdPartyPayer;
    const customerPayload = { ...payload, exclTaxesTpp: 0, inclTaxesTpp: 0, company: company._id };
    customerCN = await exports.formatCreditNote(customerPayload, company.prefixNumber, number.prefix, number.seq);
    number.seq++;
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

  return Promise.all([
    ...promises,
    CreditNote.insertMany(creditNotes),
    CreditNoteNumber.updateOne({ prefix: number.prefix }, { $set: { seq: number.seq } }),
  ]);
};

exports.updateCreditNotes = async (creditNoteFromDB, payload, credentials) => {
  if (creditNoteFromDB.events) await exports.updateEventAndFundingHistory(creditNoteFromDB.events, true, credentials);

  let creditNote;
  if (!creditNoteFromDB.linkedCreditNote) {
    creditNote = await CreditNote.findByIdAndUpdate(creditNoteFromDB._id, { $set: payload }, { new: true });
  } else {
    const tppPayload = { ...payload, inclTaxesCustomer: 0, exclTaxesCustomer: 0 };
    const customerPayload = { ...payload, inclTaxesTpp: 0, exclTaxesTpp: 0 };
    delete customerPayload.thirdPartyPayer;

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

const formatCustomerName = customer =>
  (customer.identity.firstname
    ? `${CIVILITY_LIST[customer.identity.title]} ${customer.identity.firstname} ${customer.identity.lastname}`
    : `${CIVILITY_LIST[customer.identity.title]} ${customer.identity.lastname}`);

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

exports.formatPDF = (creditNote, company) => {
  const computedData = {
    totalVAT: 0,
    date: moment(creditNote.date).format('DD/MM/YYYY'),
    number: creditNote.number,
    forTpp: !!creditNote.thirdPartyPayer,
    recipient: {
      address: creditNote.thirdPartyPayer
        ? get(creditNote, 'thirdPartyPayer.address', {})
        : get(creditNote, 'customer.contact.primaryAddress', {}),
      name: creditNote.thirdPartyPayer ? creditNote.thirdPartyPayer.name : formatCustomerName(creditNote.customer),
    },
  };

  if (creditNote.events && creditNote.events.length > 0) {
    computedData.formattedEvents = [];
    const sortedEvents = creditNote.events.map(ev => ev).sort((ev1, ev2) => ev1.startDate - ev2.startDate);

    for (const event of sortedEvents) {
      computedData.formattedEvents.push(formatEventForPdf(event));
      computedData.totalVAT += computeCreditNoteEventVat(creditNote, event);
    }
  } else {
    computedData.subscription = {
      service: creditNote.subscription.service.name,
      unitInclTaxes: UtilsHelper.formatPrice(creditNote.subscription.unitInclTaxes),
    };
  }

  computedData.totalVAT = UtilsHelper.formatPrice(computedData.totalVAT);

  return {
    creditNote: {
      customer: {
        identity: { ...creditNote.customer.identity, title: CIVILITY_LIST[get(creditNote, 'customer.identity.title')] },
        contact: creditNote.customer.contact,
      },
      exclTaxes: creditNote.exclTaxesTpp
        ? UtilsHelper.formatPrice(creditNote.exclTaxesTpp)
        : UtilsHelper.formatPrice(creditNote.exclTaxesCustomer),
      inclTaxes: creditNote.inclTaxesTpp
        ? UtilsHelper.formatPrice(creditNote.inclTaxesTpp)
        : UtilsHelper.formatPrice(creditNote.inclTaxesCustomer),
      ...computedData,
      company,
      logo: 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png',
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
  const data = exports.formatPDF(creditNote, company);
  const pdf = await PdfHelper.generatePdf(data, './src/data/creditNote.html');

  return { pdf, creditNoteNumber: creditNote.number };
};
