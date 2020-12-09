const flat = require('flat');
const Card = require('../models/Card');
const Activity = require('../models/Activity');
const GCloudStorageHelper = require('./gCloudStorage');
const { MULTIPLE_CHOICE_QUESTION, SINGLE_CHOICE_QUESTION, QUESTION_ANSWER } = require('./constants');

exports.addCard = async (activityId, payload) => {
  const card = await Card.create(payload);
  await Activity.updateOne({ _id: activityId }, { $push: { cards: card._id } });
};

exports.updateCard = async (cardId, payload) => Card.updateOne(
  { _id: cardId },
  { $set: flat(payload, { safe: true }) }
);

exports.addCardAnswer = async cardId => Card.updateOne({ _id: cardId }, { $push: { qcAnswers: { text: '' } } });

exports.getAnswerKeyToUpdate = (template) => {
  if ([MULTIPLE_CHOICE_QUESTION, SINGLE_CHOICE_QUESTION, QUESTION_ANSWER].includes(template)) return 'qcAnswers';

  return '';
};

exports.updateCardAnswer = async (card, params, payload) => {
  const key = exports.getAnswerKeyToUpdate(card.template);

  return Card.updateOne(
    { _id: card._id, [`${key}._id`]: params.answerId },
    { $set: flat({ [`${key}.$`]: payload }) }
  );
};

exports.deleteCardAnswer = async params => Card.updateOne(
  { _id: params._id }, { $pull: { qcAnswers: { _id: params.answerId } } }
);

exports.uploadMedia = async (cardId, payload) => {
  const mediaUploaded = await GCloudStorageHelper.uploadProgramMedia(payload);

  await Card.updateOne(
    { _id: cardId },
    { $set: flat({ media: mediaUploaded }) }
  );
};

exports.deleteMedia = async (cardId, publicId) => {
  if (!publicId) return;

  await Card.updateOne({ _id: cardId }, { $unset: { 'media.publicId': '', 'media.link': '' } });
  await GCloudStorageHelper.deleteProgramMedia(publicId);
};

exports.removeCard = async (cardId) => {
  await Activity.updateOne({ cards: cardId }, { $pull: { cards: cardId } });
  await Card.deleteOne({ _id: cardId });
};
