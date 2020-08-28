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
  OPEN_QUESTION,
  SURVEY,
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
  OPEN_QUESTION,
  SURVEY,
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
  question: { type: String },
  qcuGoodAnswer: { type: String },
  falsyAnswers: {
    type: [String],
    default: undefined,
  },
  qcmAnswers: {
    type: [mongoose.Schema({ label: { type: String }, correct: { type: Boolean } }, { _id: false })],
    default: undefined,
  },
  explanation: { type: String },
  orderedAnswers: {
    type: [String],
    default: undefined,
  },
}, { timestamps: true });

async function save(next) {
  try {
    if (this.isNew) {
      switch (this.template) {
        case FILL_THE_GAPS:
        case SINGLE_CHOICE_QUESTION:
          this.falsyAnswers = [];
          break;
        case ORDER_THE_SEQUENCE:
          this.orderedAnswers = [];
          break;
        case MULTIPLE_CHOICE_QUESTION:
          this.qcmAnswers = [];
          break;
      }
    }

    return next();
  } catch (e) {
    return next(e);
  }
}

CardSchema.pre('save', save);

module.exports = mongoose.model('Card', CardSchema);
module.exports.CARD_TEMPLATES = CARD_TEMPLATES;
