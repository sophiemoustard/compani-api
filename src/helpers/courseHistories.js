const pick = require('lodash/pick');
const CourseHistory = require('../models/CourseHistory');
const { SLOT_CREATION, SLOT_DELETION } = require('./constants');

exports.createHistory = action => async (payload, userId) => CourseHistory.create({
  createdBy: userId,
  action,
  course: payload.courseId,
  slot: pick(payload, ['startDate', 'endDate', 'address']),
});

exports.createHistoryOnSlotCreation = exports.createHistory(SLOT_CREATION);

exports.createHistoryOnSlotDeletion = exports.createHistory(SLOT_DELETION);

exports.list = async (query) => {
  const findQuery = { course: query.course };
  if (query.createdAt) findQuery.createdAt = { $lt: query.createdAt };

  return CourseHistory.find(findQuery)
    .populate({ path: 'createdBy', select: '_id identity picture' })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
};
