const pick = require('lodash/pick');
const moment = require('../extensions/moment');
const CourseHistory = require('../models/CourseHistory');
const { SLOT_CREATION, SLOT_DELETION, SLOT_EDITION } = require('./constants');

exports.createHistory = async (payload, userId, action) => CourseHistory.create({
  createdBy: userId,
  action,
  course: payload.courseId,
  slot: pick(payload, ['startDate', 'endDate', 'address']),
});

exports.createHistoryOnSlotCreation = (payload, userId) => exports.createHistory(payload, userId, SLOT_CREATION);

exports.createHistoryOnSlotDeletion = (payload, userId) => exports.createHistory(payload, userId, SLOT_DELETION);

exports.createHistoryOnSlotEdition = async (slotFromDb, payload, userId) => {
  const isDateUpdated = moment(slotFromDb.startDate).isSame(payload.startDate, 'd');
  if (!isDateUpdated) {
    await CourseHistory.create({
      createdBy: userId,
      action: SLOT_EDITION,
      course: slotFromDb.courseId,
      update: { startDate: { from: slotFromDb.startDate, to: payload.startDate } },
    });
  }
};

exports.list = async (query) => {
  const findQuery = { course: query.course };
  if (query.createdAt) findQuery.createdAt = { $lt: query.createdAt };

  return CourseHistory.find(findQuery)
    .populate({ path: 'createdBy', select: '_id identity picture' })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
};
