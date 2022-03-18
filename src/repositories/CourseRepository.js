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
