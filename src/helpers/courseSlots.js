const Boom = require('@hapi/boom');
const pickBy = require('lodash/pickBy');
const { ObjectID } = require('mongodb');
const translate = require('./translate');
const CourseSlot = require('../models/CourseSlot');
const courseHistories = require('./courseHistories');
const { SLOT_CREATION } = require('./constants');

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

  courseHistories.createHistoryOnSlotCreation({
    createdBy: new ObjectID(),
    action: SLOT_CREATION,
    course: payload.courseId,
    slot: {
      startDate: payload.startDate,
      endDate: payload.endDate,
      address: payload.address ? payload.address.fullAddress : '',
    },
  });

  return (new CourseSlot(payload)).save();
};

exports.updateCourseSlot = async (slotFromDb, payload) => {
  const hasConflicts = await exports.hasConflicts({ ...slotFromDb, ...payload });
  if (hasConflicts) throw Boom.conflict(translate[language].courseSlotConflict);

  const updatePayload = { $set: pickBy(payload) };

  if (!payload.step) updatePayload.$unset = { step: '' };

  await CourseSlot.updateOne({ _id: slotFromDb._id }, updatePayload);
};

exports.removeCourseSlot = async courseSlotId => CourseSlot.deleteOne({ _id: courseSlotId });
