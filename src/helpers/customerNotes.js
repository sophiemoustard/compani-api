const CustomerNote = require('../models/CustomerNote');
const CustomerNoteHistory = require('../models/CustomerNoteHistory');
const { NOTE_CREATION, NOTE_UPDATE } = require('./constants');

exports.create = async (payload, credentials) => {
  const customerNote = await CustomerNote.create({ ...payload, company: credentials.company._id });

  await CustomerNoteHistory.create({
    customerNote: customerNote._id,
    title: payload.title,
    description: payload.description,
    company: credentials.company._id,
    action: NOTE_CREATION,
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

exports.createHistory = async (query, credentials, customerNoteId) => {
  await CustomerNoteHistory.create({
    ...query,
    customerNote: customerNoteId,
    company: credentials.company._id,
    createdBy: credentials._id,
    action: NOTE_UPDATE,
  });
};

exports.update = async (customerNoteId, payload, credentials) => {
  const promises = [];
  const initialCustomerNote = await CustomerNote
    .findOne({ _id: customerNoteId, company: credentials.company._id })
    .lean();

  if (payload.description.trim() !== initialCustomerNote.description) {
    promises.push(this.createHistory({ description: payload.description }, credentials, customerNoteId));
  }
  if (promises.length) {
    await CustomerNote.updateOne({ _id: customerNoteId, company: credentials.company._id }, { $set: payload });
  }
  await Promise.all(promises);
};
