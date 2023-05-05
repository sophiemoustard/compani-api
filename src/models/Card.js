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
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');
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
    publicId: { type: String, required() { return !!this.media.link; } },
    link: { type: String, trim: true, required() { return !!this.media.publicId; } },
    type: { type: String, enum: MEDIA_TYPES, required() { return !!this.media.publicId || this.media.link; } },
  },
  gappedText: { type: String },
  question: { type: String },
  qcuGoodAnswer: { type: String },
  falsyGapAnswers: {
    type: [mongoose.Schema({ text: { type: String } }, { id: false })],
    default: undefined,
  },
  canSwitchAnswers: { type: Boolean },
  isMandatory: { type: Boolean },
  qcAnswers: {
    type: [mongoose.Schema({ text: { type: String }, correct: { type: Boolean } }, { id: false })],
    default: undefined,
  },
  isQuestionAnswerMultipleChoiced: { type: Boolean },
  explanation: { type: String },
  orderedAnswers: {
    type: [mongoose.Schema({ text: { type: String } }, { id: false })],
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
        if (!this.falsyGapAnswers) this.falsyGapAnswers = [{ text: '' }, { text: '' }];
        if (!this.canSwitchAnswers) this.canSwitchAnswers = false;
        break;
      case SINGLE_CHOICE_QUESTION:
        if (!this.qcAnswers) this.qcAnswers = [{ text: '' }];
        break;
      case QUESTION_ANSWER:
        if (!this.qcAnswers) this.qcAnswers = [{ text: '' }, { text: '' }];
        if (!this.isQuestionAnswerMultipleChoiced) this.isQuestionAnswerMultipleChoiced = false;
        if (!this.isMandatory) this.isMandatory = false;
        break;
      case ORDER_THE_SEQUENCE:
        if (!this.orderedAnswers) this.orderedAnswers = [{ text: '' }, { text: '' }];
        break;
      case MULTIPLE_CHOICE_QUESTION:
        if (!this.qcAnswers) this.qcAnswers = [{ text: '', correct: false }, { text: '', correct: false }];
        break;
      case SURVEY:
        if (!this.label) this.label = { right: '', left: '' };
        if (!this.isMandatory) this.isMandatory = false;
        break;
      case TEXT_MEDIA:
        if (!this.media.type) this.media = { type: UPLOAD_IMAGE };
        break;
      case TITLE_TEXT_MEDIA:
        if (!this.media.type) this.media = { type: UPLOAD_IMAGE };
        break;
      case OPEN_QUESTION:
        if (!this.isMandatory) this.isMandatory = false;
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
queryMiddlewareList.map(middleware => CardSchema.pre(middleware, formatQuery));

CardSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Card', CardSchema);
module.exports.CARD_TEMPLATES = CARD_TEMPLATES;
