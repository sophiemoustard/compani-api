const Course = require('../models/Course');
const User = require('../models/User');
const UsersHelper = require('./users');

exports.createCourse = payload => (new Course(payload)).save();

exports.list = async query => Course.find(query).lean();

exports.getCourse = async courseId => Course.findOne({ _id: courseId })
  .populate('companies')
  .populate('program')
  .populate('slots')
  .lean();

exports.updateCourse = async (courseId, payload) =>
  Course.findOneAndUpdate({ _id: courseId }, { $set: payload }).lean();

exports.addCourseTrainee = async (courseId, payload) => {
  let trainee = await User.findOne({ 'local.email': payload.local.email }).lean();

  if (!trainee) trainee = await UsersHelper.createUser(payload);

  return Course.findOneAndUpdate({ _id: courseId }, { $addToSet: { trainee: trainee._id } }).lean();
};
