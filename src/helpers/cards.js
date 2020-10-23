const moment = require('moment');
const flat = require('flat');
const Card = require('../models/Card');
const Activity = require('../models/Activity');
const CloudinaryHelper = require('./cloudinary');

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
  { _id: params._id }, { $pop: { questionAnswers: -1 } }
);

exports.uploadMedia = async (cardId, payload) => {
  const imageUploaded = await CloudinaryHelper.addImage({
    file: payload.file,
    folder: 'images/business/Compani/cards',
    public_id: `${payload.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`,
  });

  const updatePayload = {
    media: {
      publicId: imageUploaded.public_id,
      link: imageUploaded.secure_url,
    },
  };

  await Card.updateOne({ _id: cardId }, { $set: flat(updatePayload) });
};

exports.removeCard = async (cardId) => {
  await Activity.updateOne({ cards: cardId }, { $pull: { cards: cardId } });
  await Card.deleteOne({ _id: cardId });
};
