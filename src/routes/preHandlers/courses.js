
const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Course = require('../../models/Course');
const User = require('../../models/User');
const { TRAINER } = require('../../helpers/constants');

exports.authorizeCourseGetOrUpdate = async (req) => {
  try {
    const course = await Course.findOne({ _id: req.params._id }).lean();
    if (!course) throw Boom.notFound();

    const userRole = get(req, 'auth.credentials.role.vendor.name');
    const userId = get(req, 'auth.credentials._id');
    if (userRole === TRAINER && course.trainer.toHexString() !== userId) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.getCourseTrainee = async (req) => {
  try {
    const { company, local } = req.payload;
    const trainee = await User.findOne({ 'local.email': local.email }).lean();
    if (trainee && trainee.company.toHexString() !== company) throw Boom.conflict();

    return trainee;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
