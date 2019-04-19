const moment = require('moment');

const Event = require('../models/Event');
const CreditNote = require('../models/CreditNote');
const CreditNoteNumber = require('../models/CreditNoteNumber');

const updateEventBillingStatus = async (eventsToUpdate, isBilled) => {
  const promises = [];
  for (const id of eventsToUpdate) {
    promises.push(Event.findOneAndUpdate({ _id: id }, { $set: { isBilled } }));
  }
  await Promise.all(promises);
};

const createCreditNote = (payload, prefix, seq) => {
  const creditNotePaylaod = { ...payload };
  creditNotePaylaod.number = `${prefix}${seq.toString().padStart(3, '0')}`;
  const customerCreditNote = new CreditNote(creditNotePaylaod);

  return customerCreditNote.save();
};

const createCreditNotes = async (payload) => {
  const query = { prefix: `AV-${moment().format('YYMM')}` };
  const number = await CreditNoteNumber.findOneAndUpdate(query, {}, { new: true, upsert: true, setDefaultsOnInsert: true });
  let { seq } = number;

  const creditNotes = [];
  let tppCreditNote;
  let customerCreditNote;
  if (payload.inclTaxesTpp) {
    tppCreditNote = await createCreditNote(payload, number.prefix, seq);
    creditNotes.push(tppCreditNote);
    seq++;
  }
  if (payload.inclTaxesCustomer) {
    delete payload.thirdPartyPayer;
    customerCreditNote = await createCreditNote(payload, number.prefix, seq);
    creditNotes.push(customerCreditNote);
    seq++;
  }

  if (tppCreditNote && customerCreditNote) {
    await Promise.all([
      CreditNote.findOneAndUpdate({ _id: customerCreditNote._id }, { linkedCreditNote: tppCreditNote._id }),
      CreditNote.findOneAndUpdate({ _id: tppCreditNote._id }, { linkedCreditNote: customerCreditNote._id }),
    ]);
  }

  if (payload.events) await updateEventBillingStatus(payload.events, false);
  await CreditNoteNumber.findOneAndUpdate(query, { $set: { seq } });

  return creditNotes;
};

module.exports = {
  updateEventBillingStatus,
  createCreditNotes,
};
