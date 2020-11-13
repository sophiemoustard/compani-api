const moment = require('moment');
const flat = require('flat');
const Card = require('../models/Card');
const Activity = require('../models/Activity');
const GCloudStorageHelper = require('./gCloudStorage');

exports.addCard = async (activityId, payload) => {
  const card = await Card.create(payload);
  await Activity.updateOne({ _id: activityId }, { $push: { cards: card._id } });
};

exports.updateCard = async (cardId, payload) => Card.updateOne(
  { _id: cardId },
  { $set: flat(payload, { safe: true }) }
);

exports.addCardAnswer = async cardId => Card.updateOne({ _id: cardId }, { $push: { questionAnswers: { text: '' } } });

exports.updateCardAnswer = async (params, payload) => Card.updateOne(
  { _id: params._id, 'questionAnswers._id': params.answerId },
  { $set: { 'questionAnswers.$.text': payload.text } }
);

exports.deleteCardAnswer = async params => Card.updateOne(
  { _id: params._id }, { $pull: { questionAnswers: { _id: params.answerId } } }
);

exports.uploadMedia = async (cardId, payload) => {
  const fileName = `${payload.fileName}-${moment().format('YYYYMMDDHHmmss')}`;
  const imageUploaded = await GCloudStorageHelper.uploadMedia({ fileName, file: payload.file });

  await Card.updateOne(
    { _id: cardId },
    { $set: flat({ media: { publicId: fileName, link: imageUploaded } }) }
  );
};

exports.deleteMedia = async (params) => {
  await Card.updateOne({ _id: params._id }, { $unset: { 'media.publicId': '', 'media.link': '' } });
  await GCloudStorageHelper.deleteMedia(params.publicId);
};

exports.removeCard = async (cardId) => {
  await Activity.updateOne({ cards: cardId }, { $pull: { cards: cardId } });
  await Card.deleteOne({ _id: cardId });
};
