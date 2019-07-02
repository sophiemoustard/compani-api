const moment = require('moment');
const get = require('lodash/get');
const Event = require('../models/Event');
const CreditNote = require('../models/CreditNote');
const CreditNoteNumber = require('../models/CreditNoteNumber');
const FundingHistory = require('../models/FundingHistory');
const UtilsHelper = require('./utils');
const { HOURLY } = require('./constants');

exports.updateEventAndFundingHistory = async (eventsToUpdate, isBilled) => {
  const promises = [];
  const events = await Event.find({ _id: { $in: eventsToUpdate.map(ev => ev.eventId) } });
  for (const event of events) {
    if (event.bills.thirdPartyPayer) {
      if (event.bills.nature !== HOURLY) {
        await FundingHistory.findOneAndUpdate(
          { fundingVersion: event.bills.fundingVersion },
          { $inc: { amountTTC: isBilled ? event.bills.inclTaxesTpp : -event.bills.inclTaxesTpp } },
        );
      } else {
        let history = await FundingHistory.findOneAndUpdate(
          { fundingVersion: event.bills.fundingVersion, month: moment(event.startDate).format('MM/YYYY') },
          { $inc: { careHours: isBilled ? event.bills.careHours : -event.bills.careHours } },
        );
        if (!history) {
          history = await FundingHistory.findOneAndUpdate(
            { fundingVersion: event.bills.fundingVersion },
            { $inc: { careHours: isBilled ? event.bills.careHours : -event.bills.careHours } },
          );
        }
      }
    }

    event.isBilled = isBilled;
    promises.push(event.save());
  }
  await Promise.all(promises);
};

exports.createCreditNote = (payload, prefix, seq) => {
  payload.number = `${prefix}${seq.toString().padStart(3, '0')}`;
  if (payload.inclTaxesCustomer) payload.inclTaxesCustomer = UtilsHelper.getFixedNumber(payload.inclTaxesCustomer, 2);
  if (payload.inclTaxesTpp) payload.inclTaxesTpp = UtilsHelper.getFixedNumber(payload.inclTaxesTpp, 2);
  const customerCreditNote = new CreditNote(payload);

  return customerCreditNote.save();
};

exports.createCreditNotes = async (payload) => {
  const query = { prefix: `AV-${moment().format('YYMM')}` };
  const number = await CreditNoteNumber.findOneAndUpdate(query, {}, { new: true, upsert: true, setDefaultsOnInsert: true });
  let { seq } = number;

  let creditNotes = [];
  let tppCreditNote;
  let customerCreditNote;
  if (payload.inclTaxesTpp) {
    const tppPayload = { ...payload, exclTaxesCustomer: 0, inclTaxesCustomer: 0 };
    tppCreditNote = await exports.createCreditNote(tppPayload, number.prefix, seq);
    creditNotes.push(tppCreditNote);
    seq++;
  }
  if (payload.inclTaxesCustomer) {
    delete payload.thirdPartyPayer;
    const customerPayload = { ...payload, exclTaxesTpp: 0, inclTaxesTpp: 0 };
    customerCreditNote = await exports.createCreditNote(customerPayload, number.prefix, seq);
    creditNotes.push(customerCreditNote);
    seq++;
  }

  if (tppCreditNote && customerCreditNote) {
    creditNotes = await Promise.all([
      CreditNote.findOneAndUpdate({ _id: customerCreditNote._id }, { $set: { linkedCreditNote: tppCreditNote._id } }),
      CreditNote.findOneAndUpdate({ _id: tppCreditNote._id }, { $set: { linkedCreditNote: customerCreditNote._id } }),
    ]);
  }

  if (payload.events) await exports.updateEventAndFundingHistory(payload.events);
  await CreditNoteNumber.findOneAndUpdate(query, { $set: { seq } });

  return creditNotes;
};

const formatCustomerName = customer => (customer.identity.firstname
  ? `${customer.identity.title} ${customer.identity.firstname} ${customer.identity.lastname}`
  : `${customer.identity.title} ${customer.identity.lastname}`);

exports.formatPDF = (creditNote, company) => {
  const logo = 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png';
  const computedData = {
    totalVAT: 0,
    date: moment(creditNote.date).format('DD/MM/YYYY'),
    number: creditNote.number,
    recipient: {
      address: creditNote.thirdPartyPayer ? get(creditNote, 'thirdPartyPayer.address', {}) : get(creditNote, 'customer.contact.address', {}),
      name: creditNote.thirdPartyPayer ? creditNote.thirdPartyPayer.name : formatCustomerName(creditNote.customer),
    },
  };

  if (creditNote.events && creditNote.events.length > 0) {
    computedData.formattedEvents = [];
    for (const event of creditNote.events) {
      computedData.totalVAT += creditNote.exclTaxesTpp
        ? event.bills.inclTaxesTpp - event.bills.exclTaxesTpp
        : event.bills.inclTaxesCustomer - event.bills.exclTaxesCustomer;

      const sub = creditNote.customer.subscriptions.find(sb => sb._id.toHexString() === event.subscription.toHexString());
      const version = UtilsHelper.getMatchingVersion(event.startDate, sub.service);
      computedData.formattedEvents.push({
        identity: `${event.auxiliary.identity.firstname.substring(0, 1)}. ${event.auxiliary.identity.lastname}`,
        date: moment(event.startDate).format('DD/MM'),
        startTime: moment(event.startDate).format('HH:mm'),
        endTime: moment(event.endDate).format('HH:mm'),
        service: sub && version ? version.name : '',
      });
    }
  } else {
    computedData.subscription = {
      service: creditNote.subscription.service,
      unitInclTaxes: UtilsHelper.formatPrice(creditNote.subscription.unitInclTaxes)
    };
  }

  computedData.totalVAT = UtilsHelper.formatPrice(computedData.totalVAT);

  return {
    creditNote: {
      customer: { identity: creditNote.customer.identity, contact: creditNote.customer.contact },
      exclTaxes: creditNote.exclTaxesTpp ? UtilsHelper.formatPrice(creditNote.exclTaxesTpp) : UtilsHelper.formatPrice(creditNote.exclTaxesCustomer),
      inclTaxes: creditNote.inclTaxesTpp ? UtilsHelper.formatPrice(creditNote.inclTaxesTpp) : UtilsHelper.formatPrice(creditNote.inclTaxesCustomer),
      ...computedData,
      company,
      logo
    },
  };
};
