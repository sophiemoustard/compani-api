const Boom = require('@hapi/boom');
const Step = require('../models/Step');
const Program = require('../models/Program');

exports.updateStep = async (stepId, payload) =>
  Step.findOneAndUpdate({ _id: stepId }, { $set: payload }, { new: true }).lean();

exports.addStep = async (programId, payload) => {
  const program = await Program.countDocuments({ _id: programId });
  if (!program) throw Boom.badRequest();

  const step = await Step.create(payload);
  return Program.updateOne({ _id: programId }, { $push: { steps: step._id } });
};
