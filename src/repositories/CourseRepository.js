const Course = require('../models/Course');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');

exports.findCourseAndPopulate = query => Course.find(query)
  .populate({ path: 'company', select: 'name' })
  .populate({ path: 'program', select: 'name' })
  .populate({ path: 'slots', select: 'startDate endDate' })
  .populate({ path: 'trainer', select: 'identity.firstname identity.lastname' })
  .populate({ path: 'trainees', select: 'company', populate: { path: 'company', select: 'name' } })
  .lean({ virtuals: true });

exports.findCourses = (query) => {
  let filterTraineesFromCompany = {};
  let filterCoursesWithTraineeFromCompany = {};
  if (query.company) {
    filterTraineesFromCompany = { 'company._id': new ObjectID(query.company) };
    filterCoursesWithTraineeFromCompany = {
      trainees: { $elemMatch: { 'company._id': new ObjectID(query.company) } },
    };
    query = {
      ...omit(query, ['company']),
      $or: [{ company: new ObjectID(query.company) }, { company: { $exists: false } }],
    };
  }

  return Course.aggregate([
    { $match: query },
    { $lookup: { from: 'companies', localField: 'company', foreignField: '_id', as: 'company' } },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'programs', localField: 'program', foreignField: '_id', as: 'program' } },
    { $unwind: { path: '$program' } },
    { $lookup: { from: 'users', localField: 'trainer', foreignField: '_id', as: 'trainer' } },
    { $unwind: { path: '$trainer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'courseslots',
        let: { courseId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$$courseId', '$courseId'] } } },
          { $sort: { startDate: 1 } },
        ],
        as: 'slots',
      },
    },
    {
      $lookup: {
        from: 'users',
        let: { traineesId: '$trainees' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$traineesId'] } } },
          {
            $lookup: {
              from: 'companies',
              localField: 'company',
              foreignField: '_id',
              as: 'company',
            },
          },
          { $unwind: { path: '$company' } },
          { $match: filterTraineesFromCompany },
        ],
        as: 'trainees',
      },
    },
    { $match: filterCoursesWithTraineeFromCompany },
    {
      $addFields: {
        possibleCompany: { $ifNull: [{ $concat: ['$company.name', ' - '] }, ''] },
        possibleMisc: { $ifNull: [{ $concat: [' - ', '$misc'] }, ''] },
      },
    },
    { $addFields: { name: { $concat: ['$possibleCompany', '$program.name', '$possibleMisc'] } } },
    {
      $project: {
        _id: 1,
        type: 1,
        name: 1,
        company: { _id: 1, name: 1 },
        program: { _id: 1, name: 1 },
        trainer: {
          _id: 1,
          identity: { firstname: 1, lastname: 1 },
        },
        slots: { _id: 1, startDate: 1, endDate: 1 },
        trainees: { _id: 1, company: { _id: 1, name: 1 } },
      },
    },
  ]);
};
