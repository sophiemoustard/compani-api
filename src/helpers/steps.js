const Boom = require('@hapi/boom');
const Step = require('../models/Step');
const SubProgram = require('../models/SubProgram');

exports.updateStep = async (stepId, payload) => Step.updateOne({ _id: stepId }, { $set: payload });

exports.addStep = async (subProgramId, payload) => {
  const subProgram = await SubProgram.countDocuments({ _id: subProgramId });
  if (!subProgram) throw Boom.badRequest();

  const step = await Step.create(payload);
  await SubProgram.updateOne({ _id: subProgramId }, { $push: { steps: step._id } });
};

exports.detachStep = async (subProgramId, stepId) =>
  SubProgram.updateOne({ _id: subProgramId }, { $pull: { steps: stepId } });
