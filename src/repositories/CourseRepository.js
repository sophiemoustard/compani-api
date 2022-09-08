const get = require('lodash/get');
const Course = require('../models/Course');
const CourseSlot = require('../models/CourseSlot');
const { WEBAPP } = require('../helpers/constants');

exports.findCourseAndPopulate = (query, populateVirtual = false) => Course
  .find(query, query.origin === WEBAPP ? 'misc type archivedAt estimatedStartDate' : 'misc')
  .populate([
    { path: 'company', select: 'name' },
    {
      path: 'subProgram',
      select: 'program',
      populate: [
        { path: 'program', select: query.origin === WEBAPP ? 'name' : 'name image description' },
        { path: 'steps', select: 'theoreticalHours' },
      ],
    },
    { path: 'slots', select: 'startDate endDate' },
    { path: 'slotsToPlan', select: '_id' },
    ...(query.origin === WEBAPP
      ? [
        { path: 'trainer', select: 'identity.firstname identity.lastname' },
        {
          path: 'trainees',
          select: '_id',
          populate: { path: 'company', populate: { path: 'company', select: 'name' } },
        },
        { path: 'salesRepresentative', select: 'identity.firstname identity.lastname' },
      ]
      : []
    ),
  ])
  .lean({ virtuals: populateVirtual });

exports.findCoursesForExport = async (startDate, endDate, credentials) => {
  const slots = await CourseSlot.find({ startDate: { $lte: endDate }, endDate: { $gte: startDate } }).lean();
  const courseIds = slots.map(slot => slot.course);
  const isVendorUser = !!get(credentials, 'role.vendor');

  return Course
    .find({
      $or: [
        { _id: { $in: courseIds } },
        { estimatedStartDate: { $lte: endDate, $gte: startDate }, archivedAt: { $exists: false } },
      ],
      select: '_id type misc estimatedStartDate',
    })
    .populate({ path: 'company', select: 'name' })
    .populate({
      path: 'subProgram',
      select: 'name steps program',
      populate: [
        { path: 'program', select: 'name' },
        {
          path: 'steps',
          select: 'type activities',
          populate: { path: 'activities', populate: { path: 'activityHistories' } },
        },
      ],
    })
    .populate({ path: 'trainer', select: 'identity' })
    .populate({ path: 'salesRepresentative', select: 'identity' })
    .populate({ path: 'contact', select: 'identity' })
    .populate({ path: 'slots', populate: 'attendances', select: 'attendances startDate endDate' })
    .populate({ path: 'slotsToPlan', select: '_id' })
    .populate({ path: 'trainees', select: 'firstMobileConnection' })
    .populate({
      path: 'bills',
      select: 'payer company billedAt mainFee billingPurchaseList',
      options: { isVendorUser },
      populate: [
        { path: 'payer.fundingOrganisation', select: 'name' },
        { path: 'payer.company', select: 'name' },
        { path: 'company', select: 'name' },
        { path: 'courseCreditNote', options: { isVendorUser }, select: '_id' },
        { path: 'coursePayments', options: { isVendorUser }, select: 'netInclTaxes nature' },
      ],
    })
    .lean();
};
