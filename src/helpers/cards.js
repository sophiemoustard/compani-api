const Boom = require('@hapi/boom');
const Card = require('../models/Card');
const Activity = require('../models/Activity');

exports.addCard = async (activityId, payload) => {
  const activity = await Activity.countDocuments({ _id: activityId });
  if (!activity) throw Boom.badRequest();

  const card = await Card.create(payload);
  return Activity.findOneAndUpdate({ _id: activityId }, { $push: { cards: card._id } }, { new: true }).lean();
};
