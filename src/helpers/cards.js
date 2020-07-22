const Boom = require('@hapi/boom');
const Card = require('../models/Card');
const Activity = require('../models/Activity');

exports.addCard = async (activityId, payload) => {
  const activity = await Activity.countDocuments({ _id: activityId });
  if (!activity) throw Boom.badRequest();

  const card = await Card.create(payload);
  await Activity.updateOne({ _id: activityId }, { $push: { cards: card._id } });
};

exports.updateCard = async (cardId, payload) => Card.updateOne({ _id: cardId }, { $set: payload });
