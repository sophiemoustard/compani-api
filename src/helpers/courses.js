const Course = require('../models/Course');
const User = require('../models/User');
const Role = require('../models/Role');
const UsersHelper = require('./users');
const { AUXILIARY } = require('./constants');

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

  if (!trainee) {
    const auxiliaryRole = await Role.findOne({ name: AUXILIARY }, { _id: 1 }).lean();
    trainee = await UsersHelper.createUser({ ...payload, role: auxiliaryRole._id });
  }

  return Course.findOneAndUpdate({ _id: courseId }, { $addToSet: { trainees: trainee._id } }, { new: true }).lean();
};
