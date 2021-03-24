const Boom = require('@hapi/boom');
const get = require('lodash/get');
const SubProgram = require('../../models/SubProgram');
const Program = require('../../models/Program');
const Company = require('../../models/Company');
const CourseSlot = require('../../models/CourseSlot');
const { PUBLISHED, TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN } = require('../../helpers/constants');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeStepDetachment = async (req) => {
  const subProgram = await SubProgram.findOne({ _id: req.params._id, steps: req.params.stepId }).lean();
  if (!subProgram) throw Boom.notFound();
  if (subProgram.status === PUBLISHED) throw Boom.forbidden();

  const courseSlot = await CourseSlot.countDocuments({ step: req.params.stepId });
  if (courseSlot) throw Boom.conflict();

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
    .populate({ path: 'program', select: '_id' })
    .populate({ path: 'steps', select: '_id type', populate: { path: 'activities', populate: 'cards' } })
    .lean({ virtuals: true });

  if (!subProgram) throw Boom.notFound();

  if (subProgram.status === PUBLISHED) throw Boom.forbidden();

  if (req.payload.status === PUBLISHED && !subProgram.areStepsValid) throw Boom.forbidden();

  if (req.payload.steps) {
    const onlyOrderIsUpdated = subProgram.steps.length === req.payload.steps.length &&
      subProgram.steps.every(value => req.payload.steps.includes(value._id.toHexString())) &&
      req.payload.steps.every(value => subProgram.steps.map(s => s._id.toHexString()).includes(value));
    if (!onlyOrderIsUpdated) return Boom.badRequest();
  }

  if (req.payload.status === PUBLISHED && subProgram.isStrictlyELearning) {
    if (req.payload.accessCompany) {
      const company = await Company.countDocuments({ _id: req.payload.accessCompany });
      if (!company) throw Boom.badRequest();
    }

    const prog = await Program.findOne({ _id: subProgram.program })
      .populate({
        path: 'subPrograms',
        select: 'steps',
        match: { status: PUBLISHED, _id: { $ne: subProgram._id } },
        populate: { path: 'steps', select: 'type' },
      })
      .lean({ virtuals: true });

    if (prog.subPrograms.some(sp => sp.isStrictlyELearning)) {
      throw Boom.conflict(translate[language].eLearningSubProgramAlreadyExist);
    }
  }

  return null;
};

exports.checkSubProgramExists = async (req) => {
  const subProgram = await SubProgram.findOne({ _id: req.params._id }).lean();
  if (!subProgram) throw Boom.notFound();

  return null;
};

exports.authorizeGetDraftELearningSubPrograms = async (req) => {
  const userVendorRole = get(req, 'auth.credentials.role.vendor.name');
  if ([TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(userVendorRole)) return null;

  const userId = get(req, 'auth.credentials._id');
  const userRestrictedTestedPrograms = await Program.find({ testers: userId }, { _id: 1 }).lean();

  return userRestrictedTestedPrograms.map(program => program._id);
};
