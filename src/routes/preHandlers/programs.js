const Boom = require('@hapi/boom');
const Program = require('../../models/Program');

exports.checkProgramExists = async (req) => {
  const program = await Program.countDocuments({ _id: req.params._id });
  if (!program) throw Boom.notFound();

  return null;
};
