const Boom = require('@hapi/boom');
const CourseSlotsHelper = require('../helpers/courseSlots');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const courseSlot = await CourseSlotsHelper.createCourseSlot(req.payload, req.auth.credentials);

    return {
      message: translate[language].courseSlotCreated,
      data: { courseSlot },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await CourseSlotsHelper.updateCourseSlot(req.pre.courseSlot, req.payload, req.auth.credentials);

    return {
      message: translate[language].courseSlotUpdated,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await CourseSlotsHelper.removeCourseSlot(req.pre.courseSlot, req.auth.credentials);

    return {
      message: translate[language].courseSlotDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, update, remove };
