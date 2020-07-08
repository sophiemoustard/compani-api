const Boom = require('@hapi/boom');
const Module = require('../models/Module');
const Program = require('../models/Program');

exports.updateModule = async (moduleId, payload) =>
  Module.findOneAndUpdate({ _id: moduleId }, { $set: payload }, { new: true }).lean();

exports.addModule = async (programId, payload) => {
  const program = await Program.countDocuments({ _id: programId });
  if (!program) throw Boom.badRequest();

  const module = await Module.create(payload);
  return Program.findOneAndUpdate({ _id: programId }, { $push: { modules: module._id } }, { new: true }).lean();
};
