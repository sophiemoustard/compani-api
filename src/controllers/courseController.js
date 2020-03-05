const Boom = require('@hapi/boom');
const CourseHelper = require('../helpers/courses');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const courses = await CourseHelper.list(req.query);

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
    const course = await CourseHelper.createCourse(req.payload);

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
    const course = await CourseHelper.getCourse(req.params._id);

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
    const course = await CourseHelper.updateCourse(req.params._id, req.payload);

    return {
      message: translate[language].courseUpdated,
      data: { course },
    };
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
};
