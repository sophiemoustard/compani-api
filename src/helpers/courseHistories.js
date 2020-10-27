const pick = require('lodash/pick');
const CourseHistory = require('../models/CourseHistory');
const { SLOT_CREATION } = require('./constants');

exports.createHistoryOnSlotCreation = async (payload, userId) => CourseHistory.create({
  createdBy: userId,
  action: SLOT_CREATION,
  course: payload.courseId,
  slot: pick(payload, ['startDate', 'endDate', 'address']),
});

exports.list = async query => CourseHistory.find(query).lean();
