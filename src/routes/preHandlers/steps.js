const Boom = require('@hapi/boom');
const Step = require('../../models/Step');

exports.authorizeActivityAdd = async (req) => {
  const step = await Step.countDocuments({ _id: req.params._id });
  if (!step) throw Boom.badRequest();

  return null;
};
