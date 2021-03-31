const Questionnaire = require('../models/Questionnaire');

exports.createQuestionnaire = async payload => Questionnaire.create(payload);

exports.list = async () => Questionnaire.find({}).lean();
