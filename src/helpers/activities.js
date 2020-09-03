const pick = require('lodash/pick');
const { ObjectID } = require('mongodb');
const Activity = require('../models/Activity');
const Step = require('../models/Step');
const Card = require('../models/Card');

exports.getActivity = async activityId => Activity.findOne({ _id: activityId })
  .populate({ path: 'cards', select: '-__v -createdAt -updatedAt' })
  .populate({
    path: 'steps',
    select: '_id -activities',
    populate: { path: 'subProgram', select: '_id -steps', populate: { path: 'program', select: 'name -subPrograms' } },
  })
  .lean();

exports.updateActivity = async (activityId, payload) => Activity.updateOne({ _id: activityId }, { $set: payload });

exports.addActivity = async (stepId, payload) => {
  let newActivity;
  if (payload.activityId) {
    const duplicatedActivity = await exports.getActivity(payload.activityId);

    const duplicatedCards = duplicatedActivity.cards.map(c => ({ ...c, _id: new ObjectID() }));
    await Card.insertMany(duplicatedCards);

    newActivity = { ...pick(duplicatedActivity, ['name', 'type']), cards: duplicatedCards.map(c => c._id) };
  } else newActivity = payload;

  const createdActivity = await Activity.create(newActivity);
  await Step.updateOne({ _id: stepId }, { $push: { activities: createdActivity._id } });
};

exports.detachActivity = async (stepId, activityId) =>
  Step.updateOne({ _id: stepId }, { $pull: { activities: activityId } });
