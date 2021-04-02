const Questionnaire = require('../models/Questionnaire');

exports.create = async payload => Questionnaire.create(payload);

exports.list = async () => Questionnaire.find().lean();

exports.getQuestionnaire = async id => Questionnaire.findOne({ _id: id }).lean();

exports.edit = async (id, payload) => Questionnaire
  .findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })
  .lean();
