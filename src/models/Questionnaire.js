const mongoose = require('mongoose');
const { DRAFT, PUBLISHED, EXPECTATIONS } = require('../helpers/constants');

const STATUS_TYPES = [DRAFT, PUBLISHED];
const QUESTIONNAIRE_TYPES = [EXPECTATIONS];

const QuestionnaireSchema = mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, default: DRAFT, enum: STATUS_TYPES },
  type: { type: String, required: true, enum: QUESTIONNAIRE_TYPES },
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
}, { timestamps: true });

module.exports = mongoose.model('Questionnaire', QuestionnaireSchema);
module.exports.QUESTIONNAIRE_TYPES = QUESTIONNAIRE_TYPES;
