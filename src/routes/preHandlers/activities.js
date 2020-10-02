const Boom = require('@hapi/boom');
const Activity = require('../../models/Activity');
const { PUBLISHED } = require('../../helpers/constants');
const ActivityHistory = require('../../models/ActivityHistory');

exports.authorizeActivityUpdate = async (req) => {
  const activity = await Activity.findOne({ _id: req.params._id }).lean();
  if (!activity) throw Boom.notFound();
  if (activity.status === PUBLISHED) throw Boom.forbidden();

  const { cards } = req.payload;
  if (cards) {
    const lengthAreEquals = activity.cards.length === cards.length;
    const dbCardsAreInPayload = activity.cards.every(value => cards.includes(value.toHexString()));
    const payloadCardsAreInDb = cards.every(value => activity.cards.map(s => s.toHexString()).includes(value));
    if (!lengthAreEquals || !payloadCardsAreInDb || !dbCardsAreInPayload) return Boom.badRequest();
  }

  return null;
};

exports.authorizeCardAdd = async (req) => {
  const activity = await Activity.findOne({ _id: req.params._id }).lean();
  if (!activity) throw Boom.notFound();
  if (activity.status === PUBLISHED) throw Boom.forbidden();

  return null;
};

exports.authorizeGetActivityHistory = async (req) => {
  const nbActivityHistories = await ActivityHistory.countDocuments({
    activity: req.params._id,
    user: req.auth.credentials._id,
  }).lean();
  if (nbActivityHistories === 0) throw Boom.notFound();

  return null;
};
