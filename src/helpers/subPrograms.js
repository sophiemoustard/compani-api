const Boom = require('@hapi/boom');
const Program = require('../models/Program');
const SubProgram = require('../models/SubProgram');

exports.addSubProgram = async (programId, payload) => {
  const program = await Program.countDocuments({ _id: programId });
  if (!program) throw Boom.badRequest();

  const subProgram = await SubProgram.create(payload);
  await Program.updateOne({ _id: programId }, { $push: { subPrograms: subProgram._id } });
};

exports.updateSubProgram = async (subProgramId, payload) =>
  SubProgram.updateOne({ _id: subProgramId }, { $set: payload });
