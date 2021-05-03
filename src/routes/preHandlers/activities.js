const Boom = require('@hapi/boom');
const Activity = require('../../models/Activity');
const Card = require('../../models/Card');
const { PUBLISHED } = require('../../helpers/constants');

exports.authorizeActivityUpdate = async (req) => {
  const activity = await Activity.findOne({ _id: req.params._id }).lean();
  if (!activity) throw Boom.notFound();
  if (activity.status === PUBLISHED && Object.keys(req.payload).some(key => key !== 'name')) throw Boom.forbidden();

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

exports.authorizeCardDeletion = async (req) => {
  const card = await Card.countDocuments({ _id: req.params.cardId });
  if (!card) throw Boom.notFound();

  const activity = await Activity.countDocuments({ cards: req.params.cardId, status: PUBLISHED });
  if (activity) throw Boom.forbidden();

  return null;
};
