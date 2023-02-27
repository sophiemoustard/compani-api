const get = require('lodash/get');
const pick = require('lodash/pick');
const groupBy = require('lodash/groupBy');
const mapValues = require('lodash/mapValues');
const keyBy = require('lodash/keyBy');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const UtilsHelper = require('./utils');
const CourseSlot = require('../models/CourseSlot');
const User = require('../models/User');
const { BLENDED, INTRA, VENDOR_ROLES } = require('./constants');
const CourseHistoriesHelper = require('./courseHistories');

const createSingleAttendance = async (payload, course, traineeId, traineesCompany = {}) => {
  if (course.type === INTRA) return Attendance.create({ ...payload, company: course.companies[0] });

  const traineeFromCourseInDb = course.trainees.find(tId => UtilsHelper.areObjectIdsEquals(tId, traineeId));
  if (traineeFromCourseInDb) return Attendance.create({ ...payload, company: traineesCompany[traineeId] });

  const unsubscribedTraineeUserCompany = await User
    .findOne({ _id: traineeId }, { company: 1 })
    .populate({ path: 'company' })
    .lean();

  return Attendance.create({ ...payload, company: unsubscribedTraineeUserCompany.company });
};

const createManyAttendances = async (course, courseSlotId, credentials, traineesCompany = {}) => {
  const existingAttendances = await Attendance
    .find({ courseSlot: courseSlotId, trainee: { $in: course.trainees } })
    .setOptions({ isVendorUser: VENDOR_ROLES.includes(get(credentials, 'role.vendor.name')) })
    .lean();

  const traineesWithAttendance = existingAttendances.map(a => a.trainee);
  const traineesWithoutAttendances = course.trainees
    .filter(tId => !UtilsHelper.doesArrayIncludeId(traineesWithAttendance, tId));

  const newAttendances = traineesWithoutAttendances
    .map(tId => ({
      courseSlot: courseSlotId,
      trainee: tId,
      company: course.type === INTRA ? course.companies[0] : traineesCompany[tId],
    }));

  return Attendance.insertMany(newAttendances);
};

exports.create = async (payload, credentials) => {
  const { courseSlot: courseSlotId, trainee: traineeId } = payload;

  const courseSlot = await CourseSlot.findById(courseSlotId, { course: 1 })
    .populate({ path: 'course', select: 'type trainees companies' })
    .lean();
  const { course } = courseSlot;

  const traineesCompanyAtCourseRegistration = await CourseHistoriesHelper
    .getTraineesCompanyAtCourseRegistration(course.trainees, course._id);
  const traineesCompany = mapValues(keyBy(traineesCompanyAtCourseRegistration, 'trainee'), 'company');

  if (traineeId) return createSingleAttendance(payload, course, traineeId, traineesCompany);

  return createManyAttendances(course, courseSlotId, credentials, traineesCompany);
};

exports.list = async (query, company, credentials) => Attendance
  .find({ courseSlot: { $in: query }, ...(company && { company }) })
  .setOptions({ isVendorUser: VENDOR_ROLES.includes(get(credentials, 'role.vendor.name')) })
  .lean();

const formatCourseWithAttendances = (course, specificCourseTrainees, specificCourseCompany) =>
  course.slots.map((slot) => {
    const { attendances } = slot;
    if (!attendances) return {};

    return attendances
      .filter((a) => {
        const isTraineeOnlySubscribedToSpecificCourse =
          UtilsHelper.doesArrayIncludeId(specificCourseTrainees, a.trainee._id) &&
          !UtilsHelper.doesArrayIncludeId(course.trainees, a.trainee._id);
        const isAttendanceFromSpecificCompany = !specificCourseCompany ||
          UtilsHelper.areObjectIdsEquals(a.company, specificCourseCompany);

        return isTraineeOnlySubscribedToSpecificCourse && isAttendanceFromSpecificCompany;
      }).map(a => ({
        trainee: a.trainee,
        courseSlot: pick(slot, ['step', 'startDate', 'endDate']),
        misc: course.misc,
        trainer: course.trainer,
      }));
  });

exports.listUnsubscribed = async (courseId, company, credentials) => {
  const course = await Course.findOne({ _id: courseId })
    .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'subPrograms' } })
    .lean();

  const coursesWithSameProgram = await Course
    .find({ format: BLENDED, subProgram: { $in: get(course, 'subProgram.program.subPrograms') } })
    .populate({
      path: 'slots',
      select: 'attendances startDate endDate',
      populate: {
        path: 'attendances',
        ...(company && { match: { company } }),
        select: 'trainee company',
        populate: { path: 'trainee', select: 'identity' },
        options: { isVendorUser: VENDOR_ROLES.includes(get(credentials, 'role.vendor.name')) },
      },
    })
    .populate({ path: 'trainer', select: 'identity' })
    .lean();

  const unsubscribedAttendances = coursesWithSameProgram
    .map(c => formatCourseWithAttendances(c, course.trainees, company));

  return groupBy(unsubscribedAttendances.flat(3), 'trainee._id');
};

exports.getTraineeUnsubscribedAttendances = async (traineeId, credentials) => {
  const trainee = await User.findOne({ _id: traineeId }, { company: 1 }).populate({ path: 'company' }).lean();

  const attendances = await Attendance
    .find({ trainee: traineeId, company: trainee.company })
    .populate({
      path: 'courseSlot',
      select: 'course startDate endDate',
      populate: [
        {
          path: 'course',
          match: { trainees: { $ne: traineeId } },
          select: 'trainer misc subProgram',
          populate: [
            { path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } },
            { path: 'trainer', select: 'identity' },
          ],
        },
      ],
    })
    .setOptions({ isVendorUser: VENDOR_ROLES.includes(get(credentials, 'role.vendor.name')) })
    .lean();

  const unsubscribedAttendances = attendances
    .filter(a => a.courseSlot.course)
    .map(a => ({
      courseSlot: pick(a.courseSlot, ['startDate', 'endDate']),
      course: pick(a.courseSlot.course, ['trainer.identity', 'misc']),
      program: pick(a.courseSlot.course.subProgram.program, ['_id', 'name']),
    }));

  return groupBy(unsubscribedAttendances, 'program._id');
};

exports.delete = async (query) => {
  const { courseSlot: courseSlotId, trainee: traineeId } = query;
  if (traineeId) return Attendance.deleteOne(query);

  const courseSlot = await CourseSlot.findById(courseSlotId, { course: 1 })
    .populate({ path: 'course', select: 'trainees' })
    .lean();
  const { course } = courseSlot;

  return Attendance.deleteMany({ courseSlot: courseSlotId, trainee: { $in: course.trainees } });
};
