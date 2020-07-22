const Boom = require('@hapi/boom');
const omit = require('lodash/omit');
const translate = require('./translate');
const CourseSlot = require('../models/CourseSlot');

const { language } = translate;

exports.hasConflicts = async (slot) => {
  const query = {
    courseId: slot.courseId,
    startDate: { $lt: slot.endDate },
    endDate: { $gt: slot.startDate },
  };
  if (slot._id) query._id = { $ne: slot._id };
  const slotsInConflict = await CourseSlot.countDocuments(query);

  return !!slotsInConflict;
};
exports.createCourseSlot = async (payload) => {
  const hasConflicts = await exports.hasConflicts(payload);
  if (hasConflicts) throw Boom.conflict(translate[language].courseSlotConflict);

  return (new CourseSlot(payload)).save();
};

exports.updateCourseSlot = async (slotFromDb, payload) => {
  const hasConflicts = await exports.hasConflicts({ ...slotFromDb, ...payload });
  if (hasConflicts) throw Boom.conflict(translate[language].courseSlotConflict);

  const updatePayload = { $set: omit(payload, ['step']) };

  if (!payload.step) updatePayload.$unset = { step: '' };
  else updatePayload.$set.step = payload.step;

  return CourseSlot.updateOne({ _id: slotFromDb._id }, updatePayload).lean();
};

exports.removeCourseSlot = async courseSlotId => CourseSlot.deleteOne({ _id: courseSlotId });
