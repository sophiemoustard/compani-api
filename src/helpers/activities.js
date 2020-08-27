const Boom = require('@hapi/boom');
const pick = require('lodash/pick');
const { ObjectID } = require('mongodb');
const Activity = require('../models/Activity');
const Step = require('../models/Step');
const Card = require('../models/Card');

exports.getActivity = async activityId => Activity.findOne({ _id: activityId })
  .populate({ path: 'cards', select: '-__v -createdAt -updatedAt' })
  .lean();

exports.updateActivity = async (activityId, payload) => Activity.updateOne({ _id: activityId }, { $set: payload });

exports.addActivity = async (stepId, payload) => {
  let newActivity;
  if (payload.activityId) {
    const activity = await exports.getActivity(payload.activityId);

    const duplicatedCards = activity.cards.map(c => ({ ...c, _id: new ObjectID() }));
    await Card.insertMany(duplicatedCards);

    newActivity = { ...pick(activity, ['name', 'type']), cards: duplicatedCards.map(c => c._id) };
  } else {
    const step = await Step.countDocuments({ _id: stepId });
    if (!step) throw Boom.badRequest();

    newActivity = payload;
  }

  const activity = await Activity.create(newActivity);
  await Step.updateOne({ _id: stepId }, { $push: { activities: activity._id } });
};
