const Boom = require('@hapi/boom');
const Program = require('../../models/Program');

exports.authorizeSubprogramAdd = async (req) => {
  const program = await Program.countDocuments({ _id: req.params._id });
  if (!program) throw Boom.badRequest();

  return null;
};
