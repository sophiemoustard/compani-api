const moment = require('moment');
const get = require('lodash/get');
const Event = require('../models/Event');
const CreditNote = require('../models/CreditNote');
const CreditNoteNumber = require('../models/CreditNoteNumber');
const FundingHistory = require('../models/FundingHistory');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const { HOURLY, CIVILITY_LIST } = require('./constants');

exports.updateEventAndFundingHistory = async (eventsToUpdate, isBilled, credentials) => {
  const promises = [];
  const events = await Event.find({
    _id: { $in: eventsToUpdate.map(ev => ev.eventId) },
    company: get(credentials, 'company._id', null),
  });
  for (const event of events) {
    if (event.bills.thirdPartyPayer && event.bills.fundingId) {
      if (event.bills.nature !== HOURLY) {
        await FundingHistory.findOneAndUpdate(
          { fundingId: event.bills.fundingId },
          { $inc: { amountTTC: isBilled ? event.bills.inclTaxesTpp : -event.bills.inclTaxesTpp } }
        );
      } else {
        let history = await FundingHistory.findOneAndUpdate(
          { fundingId: event.bills.fundingId, month: moment(event.startDate).format('MM/YYYY') },
          { $inc: { careHours: isBilled ? event.bills.careHours : -event.bills.careHours } }
        );
        if (!history) {
          history = await FundingHistory.findOneAndUpdate(
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

exports.formatCreditNote = (payload, prefix, seq) => {
  payload.number = `${prefix}${seq.toString().padStart(3, '0')}`;
  if (payload.inclTaxesCustomer) payload.inclTaxesCustomer = UtilsHelper.getFixedNumber(payload.inclTaxesCustomer, 2);
  if (payload.inclTaxesTpp) payload.inclTaxesTpp = UtilsHelper.getFixedNumber(payload.inclTaxesTpp, 2);

  return new CreditNote(payload);
};

exports.createCreditNotes = async (payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = { prefix: `AV-${moment(payload.date).format('YYMM')}` };
  const number = await CreditNoteNumber.findOneAndUpdate(
    query,
    {},
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  let { seq } = number;

  let tppCreditNote;
  let customerCreditNote;
  if (payload.inclTaxesTpp) {
    const tppPayload = { ...payload, exclTaxesCustomer: 0, inclTaxesCustomer: 0, company: companyId };
    tppCreditNote = await exports.formatCreditNote(tppPayload, number.prefix, seq);
    seq++;
  }
  if (payload.inclTaxesCustomer) {
    delete payload.thirdPartyPayer;
    const customerPayload = { ...payload, exclTaxesTpp: 0, inclTaxesTpp: 0, company: companyId };
    customerCreditNote = await exports.formatCreditNote(customerPayload, number.prefix, seq);
    seq++;
  }

  let creditNotes = [];
  const promises = [];
  if (tppCreditNote && customerCreditNote) {
    customerCreditNote.linkedCreditNote = tppCreditNote._id;
    tppCreditNote.linkedCreditNote = customerCreditNote._id;
    creditNotes = [customerCreditNote, tppCreditNote];
  } else if (tppCreditNote) creditNotes = [tppCreditNote];
  else creditNotes = [customerCreditNote];

  promises.push(CreditNote.insertMany(creditNotes), CreditNoteNumber.findOneAndUpdate(query, { $set: { seq } }));
  if (payload.events) promises.push(exports.updateEventAndFundingHistory(payload.events, false, credentials));
  return Promise.all(promises);
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
      await CreditNote.findByIdAndUpdate(creditNoteFromDB.linkedCreditNote, { $set: customerPayload }, { new: true });
    } else {
      creditNote = await CreditNote.findByIdAndUpdate(creditNoteFromDB._id, { $set: customerPayload }, { new: true });
      await CreditNote.findByIdAndUpdate(creditNoteFromDB.linkedCreditNote, { $set: tppPayload }, { new: true });
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

const computeCreditNoteEventVat = (creditNote, event) =>
  (creditNote.exclTaxesTpp
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
