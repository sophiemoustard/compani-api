const Boom = require('@hapi/boom');
const Activity = require('../../models/Activity');

exports.authorizeCardAdd = async (req) => {
  const activity = await Activity.countDocuments({ _id: req.params._id });
  if (!activity) throw Boom.badRequest();

  return null;
};
