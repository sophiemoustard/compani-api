const get = require('lodash/get');
const pick = require('lodash/pick');
const groupBy = require('lodash/groupBy');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const UtilsHelper = require('./utils');
const { BLENDED } = require('./constants');

exports.create = payload => (new Attendance(payload)).save();

exports.list = async (query, companyId) => {
  const attendances = await Attendance.find({ courseSlot: { $in: query } })
    .populate({ path: 'trainee', select: 'company', populate: { path: 'company' } })
    .lean();

  return companyId
    ? attendances.filter(a => UtilsHelper.areObjectIdsEquals(get(a, 'trainee.company'), companyId))
    : attendances;
};

exports.listUnsubscribed = async (courseId, companyId) => {
  const course = await Course.findOne({ _id: courseId })
    .populate({
      path: 'subProgram',
      select: 'program',
      populate: { path: 'program', select: 'subPrograms' },
    })
    .lean();

  const courseListWithSameProgram = await Course.find({
    format: BLENDED,
    subProgram: { $in: get(course, 'subProgram.program.subPrograms') },
  })
    .populate({
      path: 'slots',
      select: 'attendances step startDate endDate',
      populate: [
        {
          path: 'attendances',
          select: 'trainee',
          populate: { path: 'trainee', select: 'identity company', populate: 'company' },
        },
        { path: 'step', select: 'name' },
      ],
    })
    .populate({ path: 'trainer', select: 'identity' })
    .lean();

  const unsubscribedAttendances = courseListWithSameProgram.map((c) => {
    const { slots } = c;
    return slots.map((s) => {
      const { attendances } = s;
      if (!attendances) return {};
      return attendances.filter(a =>
        UtilsHelper.doesArrayIncludeId(course.trainees, a.trainee._id) &&
          !UtilsHelper.doesArrayIncludeId(c.trainees, a.trainee._id) &&
          (!companyId || UtilsHelper.areObjectIdsEquals(a.trainee.company, companyId))
      ).map(a => ({
        trainee: a.trainee,
        courseSlot: pick(s, ['step', 'startDate', 'endDate']),
        misc: c.misc,
        trainer: c.trainer,
      }));
    });
  });

  return groupBy(unsubscribedAttendances.flat(3), 'trainee._id');
};

exports.delete = async attendanceId => Attendance.deleteOne({ _id: attendanceId });
