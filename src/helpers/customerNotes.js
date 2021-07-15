const CustomerNote = require('../models/CustomerNote');
const CustomerNoteHistory = require('../models/CustomerNoteHistory');
const { NOTE_CREATION, NOTE_UPDATE } = require('./constants');

const createHistory = async query => CustomerNoteHistory.create(query);

exports.create = async (payload, credentials) => {
  const customerNote = await CustomerNote.create({ ...payload, company: credentials.company._id });

  await createHistory({
    customerNote: customerNote._id,
    title: payload.title,
    description: payload.description,
    action: NOTE_CREATION,
    company: credentials.company._id,
    createdBy: credentials._id,
  });
};

exports.list = async (customer, credentials) => CustomerNote.find({ customer, company: credentials.company._id })
  .populate({
    path: 'histories',
    select: 'title description createdBy action createdAt',
    populate: { path: 'createdBy', select: 'identity picture' },
  })
  .sort({ updatedAt: -1 })
  .lean();

exports.update = async (customerNoteId, payload, credentials) => {
  const promises = [];
  const query = {
    customerNote: customerNoteId,
    description: payload.description,
    action: NOTE_UPDATE,
    company: credentials.company._id,
    createdBy: credentials._id,
  };
  const initialCustomerNote = await CustomerNote.findOne({ _id: customerNoteId, company: credentials.company._id })
    .lean();

  if (payload.description.trim() !== initialCustomerNote.description) promises.push(createHistory(query));

  await CustomerNote.updateOne({ _id: customerNoteId, company: credentials.company._id }, { $set: payload });

  await Promise.all(promises);
};
