const Boom = require('@hapi/boom');
const SubProgram = require('../../models/SubProgram');
const Course = require('../../models/Course');
const { PUBLISHED, STRICTLY_E_LEARNING, E_LEARNING } = require('../../helpers/constants');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeStepDetachment = async (req) => {
  const subProgram = await SubProgram.findOne({ _id: req.params._id, steps: req.params.stepId }).lean();
  if (!subProgram) throw Boom.notFound();
  if (subProgram.status === PUBLISHED) throw Boom.forbidden();

  return null;
};

exports.authorizeStepAdd = async (req) => {
  const subProgram = await SubProgram.findOne({ _id: req.params._id }).lean();
  if (!subProgram) throw Boom.notFound();
  if (subProgram.status === PUBLISHED) throw Boom.forbidden();

  return null;
};

exports.authorizeSubProgramUpdate = async (req) => {
  const subProgram = await SubProgram.findOne({ _id: req.params._id })
    .populate({ path: 'program', select: '_id subPrograms' })
    .populate({ path: 'steps', select: '_id type' })
    .lean({ virtuals: true });

  if (!subProgram) throw Boom.notFound();

  if ((subProgram.status === PUBLISHED || req.payload.status === PUBLISHED) &&
    (Object.keys(req.payload).length > 1 || !req.payload.status)) throw Boom.forbidden();

  if (req.payload.steps) {
    const onlyOrderIsUpdated = subProgram.steps.length === req.payload.steps.length &&
      subProgram.steps.every(value => req.payload.steps.includes(value._id.toHexString())) &&
      req.payload.steps.every(value => subProgram.steps.map(s => s._id.toHexString()).includes(value));
    if (!onlyOrderIsUpdated) return Boom.badRequest();
  }

  if (req.payload.status === PUBLISHED) {
    const isStrictlyElearning = subProgram.steps.every(step => step.type === E_LEARNING);

    if (isStrictlyElearning) {
      const eLearningCourse = await Course.find({ format: STRICTLY_E_LEARNING }).lean();
      const eLearningSubPrograms = eLearningCourse.map(course => course.subProgram.toHexString());

      if (subProgram.program.subPrograms.some(sp => eLearningSubPrograms.includes(sp._id.toHexString()))) {
        throw Boom.forbidden(translate[language].eLearningSubProgramAlreadyExist);
      }
    }
  }

  return null;
};

exports.checkSubProgramExists = async (req) => {
  const subProgram = await SubProgram.findOne({ _id: req.params._id }).lean();
  if (!subProgram) throw Boom.notFound();

  return null;
};
