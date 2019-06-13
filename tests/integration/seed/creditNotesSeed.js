const { ObjectID } = require('mongodb');
const moment = require('moment');

const CreditNote = require('../../../models/CreditNote');
const { customersList } = require('./customersSeed');
const { eventsList } = require('./eventsSeed');

const creditNotesList = [
  {
    _id: new ObjectID(),
    date: moment().toDate(),
    startDate: moment().startOf('month').toDate(),
    endDate: moment().set('date', 15).toDate(),
    customer: customersList[0]._id,
    exclTaxes: 100,
    inclTaxes: 112,
    events: [eventsList[2]._id],
  },
];

const populateCreditNotes = async () => {
  await CreditNote.deleteMany({});
  await CreditNote.insertMany(creditNotesList);
};

module.exports = { creditNotesList, populateCreditNotes };
