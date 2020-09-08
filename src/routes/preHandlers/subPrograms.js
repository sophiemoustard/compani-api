const Boom = require('@hapi/boom');
const SubProgram = require('../../models/SubProgram');

exports.authorizeStepDetachment = async (req) => {
  const subProgram = await SubProgram.countDocuments({ _id: req.params._id, steps: req.params.stepId });
  if (!subProgram) throw Boom.notFound();

  return null;
};

exports.authorizeStepAdd = async (req) => {
  const subProgram = await SubProgram.countDocuments({ _id: req.params._id });
  if (!subProgram) throw Boom.notFound();
  return null;
};

exports.authorizeSubProgramUpdate = async (req) => {
  const subProgram = await SubProgram.findOne({ _id: req.params._id }).lean();
  if (!subProgram) throw Boom.notFound();

  if (req.payload.steps) {
    const onlyOrderIsUpdated = subProgram.steps.length === req.payload.steps.length &&
      subProgram.steps.every(value => req.payload.steps.includes(value.toHexString())) &&
      req.payload.steps.every(value => subProgram.steps.map(s => s.toHexString()).includes(value));
    if (!onlyOrderIsUpdated) return Boom.badRequest();
  }

  return null;
};
