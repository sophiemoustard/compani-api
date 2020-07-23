const mongoose = require('mongoose');
const { TRANSITION, TITLE_TEXT_MEDIA } = require('../helpers/constants');

const CARD_TEMPLATES = [TRANSITION, TITLE_TEXT_MEDIA];

const CardSchema = mongoose.Schema({
  template: { type: String, enum: CARD_TEMPLATES, immutable: true, required: true },
  title: { type: String },
  text: { type: String },
  media: {
    publicId: String,
    link: { type: String, trim: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('Card', CardSchema);
module.exports.CARD_TEMPLATES = CARD_TEMPLATES;
