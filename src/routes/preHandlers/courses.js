
const Boom = require('@hapi/boom');
const Course = require('../../models/Course');
const User = require('../../models/User');

exports.authorizeCourseGetOrUpdate = async (req) => {
  try {
    const course = await Course.findOne({ _id: req.params._id }).lean();
    if (!course) throw Boom.notFound();

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
