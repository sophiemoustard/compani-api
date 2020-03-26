const Boom = require('@hapi/boom');
const CourseSlot = require('../../models/CourseSlot');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeCourseSlotUpdate = async (req) => {
  try {
    const courseSlot = await CourseSlot.findOne({ _id: req.params._id }).lean();
    if (!courseSlot) throw Boom.notFound(translate[language].courseSlotNotFound);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
