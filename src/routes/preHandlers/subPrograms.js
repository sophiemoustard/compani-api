const Boom = require('@hapi/boom');
const SubProgram = require('../../models/SubProgram');

exports.authorizeStepDetachment = async (req) => {
  const subProgram = await SubProgram.findOne({ _id: req.params._id, steps: req.params.stepId }).lean();
  if (!subProgram) throw Boom.notFound();

  return null;
};
