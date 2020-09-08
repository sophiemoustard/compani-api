const omit = require('lodash/omit');
const Step = require('../models/Step');
const SubProgram = require('../models/SubProgram');

exports.updateStep = async (stepId, payload) => {
  if (payload.activities) await Step.updateOne({ _id: stepId }, { $push: { activities: payload.activities } });
  else await Step.updateOne({ _id: stepId }, { $set: omit(payload, ['activities']) });
};

exports.addStep = async (subProgramId, payload) => {
  const step = await Step.create(payload);
  await SubProgram.updateOne({ _id: subProgramId }, { $push: { steps: step._id } });
};

exports.detachStep = async (subProgramId, stepId) =>
  SubProgram.updateOne({ _id: subProgramId }, { $pull: { steps: stepId } });
