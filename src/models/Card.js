const mongoose = require('mongoose');
const { TRANSITION } = require('../helpers/constants');

const CARD_TEMPLATES = [TRANSITION];

const CardSchema = mongoose.Schema({
  template: { type: String, enum: CARD_TEMPLATES, immutable: true, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Card', CardSchema);
module.exports.CARD_TEMPLATES = CARD_TEMPLATES;
