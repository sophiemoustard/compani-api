const Program = require('../models/Program');

exports.createProgram = payload => (new Program(payload)).save();

exports.list = async query => Program.find(query).lean();

exports.getProgram = async programId => Program.findOne({ _id: programId }).populate('modules').lean();

exports.updateProgram = async (programId, payload) =>
  Program.findOneAndUpdate({ _id: programId }, { $set: payload }, { new: true }).lean();
