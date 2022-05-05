const has = require('lodash/has');
const get = require('lodash/get');
const Course = require('../models/Course');

exports.findCourseAndPopulate = (query, populateVirtual = false) => Course.find(query)
  .populate({ path: 'company', select: 'name' })
  .populate({
    path: 'subProgram',
    select: 'program',
    populate: [{ path: 'program', select: 'name image' }, { path: 'steps', select: 'theoreticalHours' }],
  })
  .populate({ path: 'slots', select: 'startDate endDate' })
  .populate({ path: 'slotsToPlan', select: '_id' })
  .populate({ path: 'trainer', select: 'identity.firstname identity.lastname' })
  .populate({
    path: 'trainees',
    select: '_id',
    populate: { path: 'company', populate: { path: 'company', select: 'name' } },
  })
  .populate({ path: 'salesRepresentative', select: 'identity.firstname identity.lastname' })
  .lean({ virtuals: populateVirtual });

exports.findCoursesForExport = (courseIds, startDate, endDate, credentials) => Course
  .find({
    $or: [
      { _id: { $in: courseIds } },
      { estimatedStartDate: { $lte: endDate, $gte: startDate }, archivedAt: { $exists: false } },
    ],
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
    select: 'courseFundingOrganisation company billedAt mainFee billingPurchaseList',
    options: { isVendorUser: has(credentials, 'role.vendor') },
    populate: [
      { path: 'courseFundingOrganisation', select: 'name' },
      { path: 'company', select: 'name' },
      { path: 'courseCreditNote', options: { isVendorUser: !!get(credentials, 'role.vendor') }, select: '_id' },
      {
        path: 'coursePayments',
        options: { isVendorUser: !!get(credentials, 'role.vendor') },
        select: 'netInclTaxes nature',
      },
    ],
  })
  .lean();
