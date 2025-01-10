const flat = require('flat');
const has = require('lodash/has');
const Card = require('../models/Card');
const GCloudStorageHelper = require('./gCloudStorage');
const {
  MULTIPLE_CHOICE_QUESTION,
  SINGLE_CHOICE_QUESTION,
  QUESTION_ANSWER,
  ORDER_THE_SEQUENCE,
  FILL_THE_GAPS,
} = require('./constants');

exports.createCard = async payload => Card.create(payload);

exports.updateCard = async (cardId, payload) => {
  const hasNullLabels = has(payload, 'labels') && Object.values(payload.labels).includes(null);

  const formattedPayload = hasNullLabels
    ? { $unset: { 'labels.2': '', 'labels.3': '', 'labels.4': '' } }
    : { $set: flat(payload, { safe: true }) };

  return Card.updateOne({ _id: cardId }, formattedPayload);
};

exports.addCardAnswer = async (card) => {
  const key = exports.getAnswerKeyToUpdate(card.template);
  const payload = [MULTIPLE_CHOICE_QUESTION, SINGLE_CHOICE_QUESTION, FILL_THE_GAPS].includes(card.template)
    ? { text: '', isCorrect: false }
    : { text: '' };

  return Card.updateOne({ _id: card._id }, { $push: { [key]: payload } });
};

exports.getAnswerKeyToUpdate = (template) => {
  if ([MULTIPLE_CHOICE_QUESTION, SINGLE_CHOICE_QUESTION, QUESTION_ANSWER].includes(template)) return 'qcAnswers';
  if (template === ORDER_THE_SEQUENCE) return 'orderedAnswers';
  if (template === FILL_THE_GAPS) return 'gapAnswers';

  return '';
};

exports.updateCardAnswer = async (card, params, payload) => {
  const key = exports.getAnswerKeyToUpdate(card.template);

  return Card.updateOne(
    { _id: card._id, [`${key}._id`]: params.answerId },
    { $set: flat({ [`${key}.$`]: payload }) }
  );
};

exports.deleteCardAnswer = async (card, params) => {
  const key = exports.getAnswerKeyToUpdate(card.template);

  return Card.updateOne(
    { _id: params._id }, { $pull: { [`${key}`]: { _id: params.answerId } } }
  );
};

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

exports.removeCard = async cardId => Card.deleteOne({ _id: cardId });
