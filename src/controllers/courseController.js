const Boom = require('@hapi/boom');
const CoursesHelper = require('../helpers/courses');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const courses = await CoursesHelper.list(req.query);

    return {
      message: courses.length ? translate[language].coursesFound : translate[language].coursesNotFound,
      data: { courses },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const course = await CoursesHelper.createCourse(req.payload);

    return {
      message: translate[language].courseCreated,
      data: { course },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getById = async (req) => {
  try {
    const course = await CoursesHelper.getCourse(req.params._id);

    return {
      message: translate[language].courseFound,
      data: { course },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const course = await CoursesHelper.updateCourse(req.params._id, req.payload);

    return {
      message: translate[language].courseUpdated,
      data: { course },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const sendSMS = async (req) => {
  try {
    const smsNotSent = await CoursesHelper.sendSMS(req.params._id, req.payload);

    return {
      message: smsNotSent.length ? translate[language].smsNotSent : translate[language].smsSent,
      data: { smsNotSent },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const addTrainee = async (req) => {
  try {
    const course = await CoursesHelper.addCourseTrainee(req.params._id, req.payload, req.pre.trainee);

    return {
      message: translate[language].courseTraineeAdded,
      data: { course },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const removeTrainee = async (req) => {
  try {
    await CoursesHelper.removeCourseTrainee(req.params._id, req.params.traineeId);

    return { message: translate[language].courseTraineeRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const downloadAttendanceSheets = async (req, h) => {
  try {
    const { zipPath, zipName } = await CoursesHelper.generateAttendanceSheets(req.params._id);

    return h.file(zipPath, { confine: false })
      .header('content-disposition', `attachment; filename=${zipName}`)
      .type('application/zip');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  getById,
  update,
  addTrainee,
  removeTrainee,
  downloadAttendanceSheets,
  sendSMS,
};
