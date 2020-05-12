
const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Course = require('../../models/Course');
const User = require('../../models/User');
const { TRAINER, INTRA } = require('../../helpers/constants');
const translate = require('../../helpers/translate');

const { language } = translate;

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
    const course = await Course.findOne({ _id: req.params._id }).lean();

    const trainee = await User.findOne({ 'local.email': local.email }).lean();
    if (trainee) {
      if (trainee.company.toHexString() !== company) {
        const message = course.type === INTRA
          ? translate[language].courseTraineeNotFromCourseCompany
          : translate[language].companyUserConflict;
        throw Boom.conflict(message);
      }

      const courseTrainee = await Course.findOne({ _id: req.params._id, trainees: trainee._id }).lean();
      if (courseTrainee) throw Boom.conflict(translate[language].courseTraineeAlreadyExists);
    }

    return trainee;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
