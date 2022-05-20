const Boom = require('@hapi/boom');
const pick = require('lodash/pick');
const translate = require('./translate');
const CourseSlot = require('../models/CourseSlot');
const Step = require('../models/Step');
const CourseHistoriesHelper = require('./courseHistories');
const { ON_SITE, REMOTE } = require('./constants');

const { language } = translate;

exports.hasConflicts = async (slot) => {
  const query = {
    course: slot.course,
    startDate: { $lt: slot.endDate },
    endDate: { $gt: slot.startDate },
  };
  if (slot._id) query._id = { $ne: slot._id };
  const slotsInConflict = await CourseSlot.countDocuments(query);

  return !!slotsInConflict;
};

exports.createCourseSlot = async payload => (new CourseSlot(payload)).save();

exports.updateCourseSlot = async (slotFromDb, payload, user) => {
  const hasConflicts = await exports.hasConflicts({ ...slotFromDb, ...payload });
  if (hasConflicts) throw Boom.conflict(translate[language].courseSlotConflict);

  const hasEmptyDates = !payload.endDate && !payload.startDate;
  if (hasEmptyDates) {
    const historyPayload = pick(slotFromDb, ['course', 'startDate', 'endDate', 'address', 'meetingLink']);
    await CourseHistoriesHelper.createHistoryOnSlotDeletion(historyPayload, user._id);
    await CourseSlot.updateOne(
      { _id: slotFromDb._id },
      { $unset: { startDate: '', endDate: '', meetingLink: '', address: '' } }
    );
  } else {
    const updatePayload = { $set: payload };
    const step = await Step.findById(slotFromDb.step._id).lean();

    if (step.type === ON_SITE || !payload.meetingLink) updatePayload.$unset = { meetingLink: '' };
    if (step.type === REMOTE || !payload.address) updatePayload.$unset = { ...updatePayload.$unset, address: '' };

    await Promise.all([
      CourseHistoriesHelper.createHistoryOnSlotEdition(slotFromDb, payload, user._id),
      CourseSlot.updateOne({ _id: slotFromDb._id }, updatePayload),
    ]);
  }
};

exports.removeCourseSlot = async (courseSlot, user) => {
  const payload = pick(courseSlot, ['course', 'startDate', 'endDate', 'address', 'meetingLink']);

  await Promise.all([
    ...Object.values({
      ...(payload.startDate &&
      [CourseHistoriesHelper.createHistoryOnSlotDeletion(payload, user._id)]
      ),
    }),
    CourseSlot.deleteOne({ _id: courseSlot._id }),
  ]);
};
