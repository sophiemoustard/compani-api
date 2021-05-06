const Boom = require('@hapi/boom');
const Activity = require('../../models/Activity');
const Card = require('../../models/Card');
const { PUBLISHED, TEXT_MEDIA, TITLE_TEXT_MEDIA } = require('../../helpers/constants');
const { getCardMediaPublicId } = require('./utils');

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

exports.authorizeCardDeletion = async (req) => {
  const { cardId } = req.params;
  const card = await Card.findOne({ _id: cardId }, { _id: 1, template: 1 }).lean();
  if (!card) throw Boom.notFound();

  const activity = await Activity.countDocuments({ cards: cardId, status: PUBLISHED });
  if (activity) throw Boom.forbidden();

  if ([TEXT_MEDIA, TITLE_TEXT_MEDIA].includes(card.template)) return getCardMediaPublicId({ params: { _id: cardId } });

  return null;
};
