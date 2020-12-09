const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
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
  QUESTION_ANSWER,
  UPLOAD_IMAGE,
  UPLOAD_VIDEO,
  UPLOAD_AUDIO,
} = require('../helpers/constants');
const { cardValidationByTemplate } = require('./validations/cardValidation');

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
  QUESTION_ANSWER,
];

const MEDIA_TYPES = [UPLOAD_IMAGE, UPLOAD_VIDEO, UPLOAD_AUDIO];

const CardSchema = mongoose.Schema({
  template: { type: String, enum: CARD_TEMPLATES, immutable: true, required: true },
  title: { type: String },
  text: { type: String },
  backText: { type: String },
  media: {
    publicId: { type: String },
    link: { type: String, trim: true },
    type: { type: String, enum: MEDIA_TYPES },
  },
  gappedText: { type: String },
  question: { type: String },
  qcuGoodAnswer: { type: String },
  falsyGapAnswers: {
    type: [String],
    default: undefined,
  },
  qcAnswers: {
    type: [mongoose.Schema({ text: { type: String }, correct: { type: Boolean } }, { id: false })],
    default: undefined,
  },
  isQuestionAnswerMultipleChoiced: { type: Boolean },
  explanation: { type: String },
  orderedAnswers: {
    type: [String],
    default: undefined,
  },
  label: mongoose.Schema({
    right: { type: String },
    left: { type: String },
  }, { default: undefined, _id: false, id: false }),
}, {
  timestamps: true,
  toObject: { virtuals: true },
  id: false,
});

function save(next) {
  if (this.isNew) {
    switch (this.template) {
      case FILL_THE_GAPS:
        this.falsyGapAnswers = [];
        break;
      case SINGLE_CHOICE_QUESTION:
        this.qcAnswers = [{ text: '' }];
        break;
      case QUESTION_ANSWER:
        this.qcAnswers = [{ text: '' }, { text: '' }];
        this.isQuestionAnswerMultipleChoiced = false;
        break;
      case ORDER_THE_SEQUENCE:
        this.orderedAnswers = [];
        break;
      case MULTIPLE_CHOICE_QUESTION:
        this.qcAnswers = [{ text: '', correct: false }, { text: '', correct: false }];
        break;
      case SURVEY:
        this.label = {};
        break;
      case TEXT_MEDIA:
        this.media = { type: UPLOAD_IMAGE };
        break;
      case TITLE_TEXT_MEDIA:
        this.media = { type: UPLOAD_IMAGE };
        break;
    }
  }

  return next();
}

function setIsValid() {
  const validation = cardValidationByTemplate(this.template).validate(this, { allowUnknown: true });
  return !validation.error;
}

CardSchema.pre('save', save);
CardSchema.virtual('isValid').get(setIsValid);

CardSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Card', CardSchema);
module.exports.CARD_TEMPLATES = CARD_TEMPLATES;
