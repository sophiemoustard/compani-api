const pick = require('lodash/pick');
const moment = require('../extensions/moment');
const CourseHistory = require('../models/CourseHistory');
const { SLOT_CREATION, SLOT_DELETION, SLOT_EDITION, TRAINEE_ADDITION, TRAINEE_DELETION } = require('./constants');

exports.createHistory = async (course, createdBy, action, payload) =>
  CourseHistory.create({ course, createdBy, action, ...payload });

exports.createHistoryOnSlotCreation = (payload, userId) => {
  const pickedFields = payload.address && Object.values(payload.address).length
    ? ['startDate', 'endDate', 'address']
    : ['startDate', 'endDate'];

  return exports.createHistory(
    payload.courseId,
    userId,
    SLOT_CREATION,
    { slot: pick(payload, pickedFields) }
  );
};

exports.createHistoryOnSlotDeletion = (payload, userId) => {
  const pickedFields = Object.values(payload.address).length
    ? ['startDate', 'endDate', 'address']
    : ['startDate', 'endDate'];

  return exports.createHistory(
    payload.courseId,
    userId,
    SLOT_DELETION,
    { slot: pick(payload, pickedFields) }
  );
};

exports.createHistoryOnTraineeAddition = (payload, userId) =>
  exports.createHistory(payload.courseId, userId, TRAINEE_ADDITION, { trainee: payload.traineeId });

exports.createHistoryOnTraineeDeletion = (payload, userId) =>
  exports.createHistory(payload.courseId, userId, TRAINEE_DELETION, { trainee: payload.traineeId });

exports.createHistoryOnSlotEdition = async (slotFromDb, payload, userId) => {
  if (!slotFromDb.startDate && payload.startDate) {
    return exports.createHistoryOnSlotCreation({ ...slotFromDb, ...payload }, userId);
  }

  const isDateUpdated = !moment(slotFromDb.startDate).isSame(payload.startDate, 'd');
  const isHourUpdated = !moment(slotFromDb.startDate).isSame(payload.startDate, 'm');

  if (isDateUpdated || isHourUpdated) {
    const actionPayload = isDateUpdated
      ? { update: { startDate: { from: slotFromDb.startDate, to: payload.startDate } } }
      : {
        update: {
          startHour: { from: slotFromDb.startDate, to: payload.startDate },
          endHour: { from: slotFromDb.endDate, to: payload.endDate },
        },
      };

    return exports.createHistory(slotFromDb.courseId, userId, SLOT_EDITION, actionPayload);
  }
};

exports.list = async (query) => {
  const findQuery = { course: query.course };
  if (query.createdAt) findQuery.createdAt = { $lt: query.createdAt };

  return CourseHistory.find(findQuery)
    .populate({ path: 'createdBy', select: '_id identity picture' })
    .populate({ path: 'trainee', select: '_id identity' })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
};
