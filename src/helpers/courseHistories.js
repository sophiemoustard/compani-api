const pick = require('lodash/pick');
const CourseHistory = require('../models/CourseHistory');
const { SLOT_CREATION } = require('./constants');

exports.createHistoryOnSlotCreation = async (payload, userId) => CourseHistory.create({
  createdBy: userId,
  action: SLOT_CREATION,
  course: payload.courseId,
  slot: pick(payload, ['startDate', 'endDate', 'address']),
});

exports.list = async (query) => {
  const findQuery = { course: query.course };
  if (query.createdAt) findQuery.createdAt = { $lt: query.createdAt };

  return CourseHistory.find(findQuery)
    .populate({ path: 'createdBy', select: '_id identity picture' })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();
};
