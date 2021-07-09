const CustomerNote = require('../models/CustomerNote');
const CustomerNoteHistory = require('../models/CustomerNoteHistory');
const { NOTE_CREATION } = require('./constants');

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

exports.update = async (customerNoteId, payload) => CustomerNote.updateOne({ _id: customerNoteId }, { $set: payload });
