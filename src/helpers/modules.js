const Module = require('../models/Module');
const Program = require('../models/Program');

exports.addModule = async (programdId, payload) => {
  const module = await Module.create(payload);

  return Program.findOneAndUpdate({ _id: programdId }, { $push: { modules: module._id } });
};
