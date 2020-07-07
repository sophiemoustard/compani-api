const { Boom } = require('@hapi/boom');
const Module = require('../models/Module');
const Program = require('../models/Program');

exports.addModule = async (programId, payload) => {
  const program = await Program.findById(programId);
  if (!program) throw Boom.badRequest();

  const module = await Module.create(payload);
  return Program.findOneAndUpdate({ _id: programId }, { $push: { modules: module._id } }, { new: true }).lean();
};
