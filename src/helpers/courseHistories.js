const pick = require('lodash/pick');
const CourseHistory = require('../models/CourseHistory');
const { SLOT_CREATION } = require('./constants');

exports.createHistoryOnSlotCreation = async (payload, userId) => CourseHistory.create({
  createdBy: userId,
  action: SLOT_CREATION,
  course: payload.courseId,
  slot: pick(payload, ['startDate', 'endDate', 'address']),
});

exports.list = async query => CourseHistory.find({ course: query.course, createdAt: { $lt: query.createdAt } })
  .populate({ path: 'createdBy', select: '_id identity picture' })
  .sort({ createdAt: -1 })
  .limit(8)
  .lean();
