const Course = require('../models/Course');

exports.findCourseAndPopulate = (localQuery, populateVirtual = false) => Course.find(localQuery)
  .populate({ path: 'company', select: '_id name' })
  .populate({ path: 'program', select: '_id name' })
  .populate({ path: 'slots', select: '_id startDate endDate' })
  .populate({ path: 'trainer', select: '_id identity.firstname identity.lastname' })
  .populate({ path: 'trainees', select: 'company', populate: { path: 'company', select: 'name' } })
  .lean({ virtuals: populateVirtual });
