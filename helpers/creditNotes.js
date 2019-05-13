const moment = require('moment');

const Event = require('../models/Event');
const CreditNote = require('../models/CreditNote');
const CreditNoteNumber = require('../models/CreditNoteNumber');
const FundingHistory = require('../models/FundingHistory');
const { getFixedNumber } = require('./utils');
const { formatPrice } = require('./utils');
const { HOURLY } = require('./constants');

const updateEventAndFundingHistory = async (eventsToUpdate, isBilled) => {
  const promises = [];
  const events = await Event.find({ _id: { $in: eventsToUpdate } });
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

const createCreditNote = (payload, prefix, seq) => {
  payload.number = `${prefix}${seq.toString().padStart(3, '0')}`;
  if (payload.inclTaxesCustomer) payload.inclTaxesCustomer = getFixedNumber(payload.inclTaxesCustomer, 2);
  if (payload.inclTaxesTpp) payload.inclTaxesTpp = getFixedNumber(payload.inclTaxesTpp, 2);
  const customerCreditNote = new CreditNote(payload);

  return customerCreditNote.save();
};

const createCreditNotes = async (payload) => {
  const query = { prefix: `AV-${moment().format('YYMM')}` };
  const number = await CreditNoteNumber.findOneAndUpdate(query, {}, { new: true, upsert: true, setDefaultsOnInsert: true });
  let { seq } = number;

  let creditNotes = [];
  let tppCreditNote;
  let customerCreditNote;
  if (payload.inclTaxesTpp) {
    const tppPayload = { ...payload, exclTaxesCustomer: 0, inclTaxesCustomer: 0 };
    tppCreditNote = await createCreditNote(tppPayload, number.prefix, seq);
    creditNotes.push(tppCreditNote);
    seq++;
  }
  if (payload.inclTaxesCustomer) {
    delete payload.thirdPartyPayer;
    const customerPayload = { ...payload, exclTaxesTpp: 0, inclTaxesTpp: 0 };
    customerCreditNote = await createCreditNote(customerPayload, number.prefix, seq);
    creditNotes.push(customerCreditNote);
    seq++;
  }

  if (tppCreditNote && customerCreditNote) {
    creditNotes = await Promise.all([
      CreditNote.findOneAndUpdate({ _id: customerCreditNote._id }, { $set: { linkedCreditNote: tppCreditNote._id } }),
      CreditNote.findOneAndUpdate({ _id: tppCreditNote._id }, { $set: { linkedCreditNote: customerCreditNote._id } }),
    ]);
  }

  if (payload.events) await updateEventAndFundingHistory(payload.events);
  await CreditNoteNumber.findOneAndUpdate(query, { $set: { seq } });

  return creditNotes;
};

const formatPDF = (creditNote, company) => {
  const logo = 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png';
  const computedData = {
    totalExclTaxes: 0,
    totalVAT: 0,
    totalInclTaxes: 0,
    date: moment(creditNote.date).format('DD/MM/YYYY'),
    formattedEvents: []
  };
  if (creditNote.events.length > 0) {
    for (let i = 0, l = creditNote.events.length; i < l; i++) {
      computedData.formattedEvents.push(creditNote.events[i]);
      if (computedData.formattedEvents[i].bills.exclTaxesTpp) {
        computedData.totalExclTaxes += computedData.formattedEvents[i].bills.exclTaxesTpp;
        computedData.totalInclTaxes += computedData.formattedEvents[i].bills.inclTaxesTpp;
        computedData.totalVAT += computedData.formattedEvents[i].bills.inclTaxesTpp - computedData.formattedEvents[i].bills.exclTaxesTpp;
      } else {
        computedData.totalExclTaxes += computedData.formattedEvents[i].bills.exclTaxesCustomer;
        computedData.totalInclTaxes += computedData.formattedEvents[i].bills.inclTaxesCustomer;
        computedData.totalVAT += computedData.formattedEvents[i].bills.inclTaxesCustomer - computedData.formattedEvents[i].bills.exclTaxesCustomer;
      }
      computedData.formattedEvents[i].auxiliary.identity.firstname = computedData.formattedEvents[i].auxiliary.identity.firstname.substring(0, 1);
      computedData.formattedEvents[i].date = moment(computedData.formattedEvents[i].startDate).format('DD/MM');
      computedData.formattedEvents[i].startTime = moment(computedData.formattedEvents[i].startDate).format('HH:mm');
      computedData.formattedEvents[i].endTime = moment(computedData.formattedEvents[i].endDate).format('HH:mm');
    }
  }
  if (!creditNote.exclTaxesTpp) {
    creditNote.exclTaxesCustomer = formatPrice(creditNote.exclTaxesCustomer);
    creditNote.inclTaxesCustomer = formatPrice(creditNote.inclTaxesCustomer);
  } else {
    creditNote.exclTaxesTpp = formatPrice(creditNote.exclTaxesTpp);
    creditNote.inclTaxesTpp = formatPrice(creditNote.inclTaxesTpp);
  }
  computedData.totalExclTaxes = formatPrice(computedData.totalExclTaxes);
  computedData.totalInclTaxes = formatPrice(computedData.totalInclTaxes);
  computedData.totalVAT = formatPrice(computedData.totalVAT);
  return {
    creditNote: {
      ...creditNote,
      ...computedData,
      company,
      logo,
    },
  };

}

module.exports = {
  updateEventAndFundingHistory,
  createCreditNotes,
  formatPDF,
};
