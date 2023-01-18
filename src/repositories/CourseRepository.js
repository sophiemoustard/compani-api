const get = require('lodash/get');
const Course = require('../models/Course');
const CourseSlot = require('../models/CourseSlot');
const { WEBAPP, MOBILE, TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN } = require('../helpers/constants');

exports.findCourseAndPopulate = (query, origin, populateVirtual = false) => Course
  .find(query, origin === WEBAPP ? 'misc type archivedAt estimatedStartDate createdAt' : 'misc')
  .populate([
    { path: 'companies', select: 'name' },
    {
      path: 'subProgram',
      select: 'program',
      populate: [
        { path: 'program', select: origin === WEBAPP ? 'name' : 'name image description' },
        { path: 'steps', select: 'theoreticalDuration type' },
      ],
    },
    {
      path: 'slots',
      select: origin === MOBILE ? 'startDate endDate step' : 'startDate endDate step address',
      populate: { path: 'step', select: 'type' },
    },
    { path: 'slotsToPlan', select: '_id' },
    ...(origin === WEBAPP
      ? [
        { path: 'trainer', select: 'identity.firstname identity.lastname' },
        {
          path: 'trainees',
          select: '_id company',
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
  const isVendorUser = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(get(credentials, 'role.vendor.name'));

  return Course
    .find({
      $or: [
        { _id: { $in: courseIds } },
        { estimatedStartDate: { $lte: endDate, $gte: startDate }, archivedAt: { $exists: false } },
      ],
      select: '_id type misc estimatedStartDate',
    })
    .populate({ path: 'companies', select: 'name' })
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
    .populate({
      path: 'slots',
      select: 'attendances startDate endDate',
      populate: { path: 'attendances', options: { isVendorUser } },
    })
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
