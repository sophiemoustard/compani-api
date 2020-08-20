const mongoose = require('mongoose');
const {
  TRANSITION,
  TITLE_TEXT_MEDIA,
  TITLE_TEXT,
  TEXT_MEDIA,
  FLASHCARD,
  FILL_THE_GAPS,
  MULTIPLE_CHOICE_QUESTION,
  SINGLE_CHOICE_QUESTION,
  ORDER_THE_SEQUENCE,
} = require('../helpers/constants');

const CARD_TEMPLATES = [
  TRANSITION,
  TITLE_TEXT_MEDIA,
  TITLE_TEXT,
  TEXT_MEDIA,
  FLASHCARD,
  FILL_THE_GAPS,
  MULTIPLE_CHOICE_QUESTION,
  SINGLE_CHOICE_QUESTION,
  ORDER_THE_SEQUENCE,
];

const CardSchema = mongoose.Schema({
  template: { type: String, enum: CARD_TEMPLATES, immutable: true, required: true },
  title: { type: String },
  text: { type: String },
  backText: { type: String },
  media: {
    publicId: { type: String },
    link: { type: String, trim: true },
  },
  answers: {
    type: [mongoose.Schema({ label: { type: String } }, { _id: false })],
    default: undefined,
  },
  explanation: { type: String },
}, { timestamps: true });

async function save(next) {
  try {
    if (this.isNew && this.template === FILL_THE_GAPS) this.answers = [];

    return next();
  } catch (e) {
    return next(e);
  }
}

CardSchema.pre('save', save);

module.exports = mongoose.model('Card', CardSchema);
module.exports.CARD_TEMPLATES = CARD_TEMPLATES;
