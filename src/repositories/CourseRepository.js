const Course = require('../models/Course');

exports.findCourseAndPopulate = (query, populateVirtual = false) => Course.find(query)
  .populate({ path: 'company', select: 'name' })
  .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name image' } })
  .populate({ path: 'slots', select: 'startDate endDate' })
  .populate({ path: 'slotsToPlan', select: '_id' })
  .populate({ path: 'trainer', select: 'identity.firstname identity.lastname' })
  .populate({ path: 'trainees', select: 'company', populate: { path: 'company', select: 'name' } })
  .lean({ virtuals: populateVirtual });
