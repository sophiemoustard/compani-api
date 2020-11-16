const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Program = require('../../models/Program');

exports.checkProgramExists = async (req) => {
  const program = await Program.countDocuments({ _id: req.params._id });
  if (!program) throw Boom.notFound();

  return null;
};

exports.getProgramImagePublicId = async (req) => {
  const program = await Program.findOne({ _id: req.params._id }).lean();
  if (!program) throw Boom.notFound();

  return get(program, 'image.publicId') || '';
};
