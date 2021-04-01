const Questionnaire = require('../models/Questionnaire');

exports.create = async payload => Questionnaire.create(payload);

exports.list = async () => Questionnaire.find().lean();
