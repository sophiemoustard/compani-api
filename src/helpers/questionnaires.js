const Questionnaire = require('../models/Questionnaire');
const CardHelper = require('./cards');

exports.create = async payload => Questionnaire.create(payload);

exports.list = async () => Questionnaire.find().lean();

exports.getQuestionnaire = async id => Questionnaire.findOne({ _id: id })
  .populate({ path: 'cards', select: '-__v -createdAt -updatedAt' })
  .lean({ virtuals: true });

exports.update = async (id, payload) => Questionnaire.findOneAndUpdate({ _id: id }, { $set: payload }).lean();

exports.addCard = async (questionnaireId, payload) => {
  const card = await CardHelper.createCard(payload);
  await Questionnaire.updateOne({ _id: questionnaireId }, { $push: { cards: card._id } });
};
