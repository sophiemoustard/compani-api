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
  SINGLE_CHOICE_QUESTION_MAX_FALSY_ANSWERS_COUNT,
  FILL_THE_GAPS_MAX_ANSWERS_COUNT,
  MULTIPLE_CHOICE_QUESTION_MAX_ANSWERS_COUNT,
  ORDER_THE_SEQUENCE_MAX_ANSWERS_COUNT,
  QUESTION_ANSWER_MAX_ANSWERS_COUNT,
  SURVEY_LABEL_MAX_LENGTH,
  QC_ANSWER_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  GAP_ANSWER_MAX_LENGTH,
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
  QUESTION_ANSWER,
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
  gappedText: { type: String },
  question: { type: String },
  qcuGoodAnswer: { type: String },
  falsyGapAnswers: {
    type: [String],
    default: undefined,
  },
  qcuFalsyAnswers: {
    type: [String],
    default: undefined,
  },
  questionAnswers: {
    type: [String],
    default: undefined,
  },
  isQuestionAnswerMultipleChoiced: { type: Boolean },
  qcmAnswers: {
    type: [mongoose.Schema({ label: { type: String }, correct: { type: Boolean } }, { _id: false, id: false })],
    default: undefined,
  },
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
        this.qcuFalsyAnswers = [];
        break;
      case QUESTION_ANSWER:
        this.questionAnswers = [];
        this.isQuestionAnswerMultipleChoiced = false;
        break;
      case ORDER_THE_SEQUENCE:
        this.orderedAnswers = [];
        break;
      case MULTIPLE_CHOICE_QUESTION:
        this.qcmAnswers = [];
        break;
      case SURVEY:
        this.label = {};
        break;
    }
  }

  return next();
}

function setIsValid() {
  switch (this.template) {
    case TRANSITION:
      return typeof this.title === 'string' && this.title !== '';
    case TITLE_TEXT_MEDIA:
      return typeof this.title === 'string' && this.title !== '' &&
        typeof this.text === 'string' && this.text !== '' &&
        typeof this.media === 'object' && this.media !== {} &&
        typeof this.media.publicId === 'string' && this.media.publicId !== '' &&
        typeof this.media.link === 'string' && this.media.link !== '';
    case TITLE_TEXT:
      return typeof this.title === 'string' && this.title !== '' &&
        typeof this.text === 'string' && this.text !== '';
    case TEXT_MEDIA:
      return typeof this.text === 'string' && this.text !== '' &&
        typeof this.media === 'object' && this.media !== {} &&
        typeof this.media.publicId === 'string' && this.media.publicId !== '' &&
        typeof this.media.link === 'string' && this.media.link !== '';
    case FLASHCARD:
      return typeof this.text === 'string' && this.text !== '' &&
      typeof this.backText === 'string' && this.backText !== '';
    case FILL_THE_GAPS:
      return typeof this.gappedText === 'string' && this.gappedText !== '' &&
        Array.isArray(this.falsyGapAnswers) && this.falsyGapAnswers.length > 1 &&
        this.falsyGapAnswers.length < FILL_THE_GAPS_MAX_ANSWERS_COUNT &&
        this.falsyGapAnswers.every(answer =>
          typeof answer === 'string' && answer !== '' && answer.length < GAP_ANSWER_MAX_LENGTH) &&
        typeof this.explanation === 'string' && this.explanation !== '';
    case SINGLE_CHOICE_QUESTION:
      return typeof this.question === 'string' && this.question !== '' && this.question.length < QUESTION_MAX_LENGTH &&
        typeof this.qcuGoodAnswer === 'string' && this.qcuGoodAnswer !== '' &&
        this.qcuGoodAnswer.length < QUESTION_MAX_LENGTH &&
        Array.isArray(this.qcuFalsyAnswers) && this.qcuFalsyAnswers.length > 0 &&
        this.qcuFalsyAnswers.length < SINGLE_CHOICE_QUESTION_MAX_FALSY_ANSWERS_COUNT &&
        this.qcuFalsyAnswers.every(answer =>
          typeof answer === 'string' && answer !== '' && answer.length < QC_ANSWER_MAX_LENGTH) &&
        typeof this.explanation === 'string' && this.explanation !== '';
    case ORDER_THE_SEQUENCE:
      return typeof this.question === 'string' && this.question !== '' && this.question.length < QUESTION_MAX_LENGTH &&
      Array.isArray(this.orderedAnswers) && this.orderedAnswers.length > 1 &&
      this.orderedAnswers.length < ORDER_THE_SEQUENCE_MAX_ANSWERS_COUNT &&
      this.orderedAnswers.every(answer => typeof answer === 'string') &&
      typeof this.explanation === 'string' && this.explanation !== '';
    case MULTIPLE_CHOICE_QUESTION:
      return typeof this.question === 'string' && this.question !== '' && this.question.length < QUESTION_MAX_LENGTH &&
        Array.isArray(this.qcmAnswers) && this.qcmAnswers.length > 1 &&
        this.qcmAnswers.length < MULTIPLE_CHOICE_QUESTION_MAX_ANSWERS_COUNT &&
        this.qcmAnswers.every(answer => typeof answer === 'object' &&
          typeof answer.label === 'string' && answer.label !== '' && answer.label.length < QC_ANSWER_MAX_LENGTH &&
          typeof answer.correct === 'boolean') &&
        this.qcmAnswers.some(answer => answer.correct === true) &&
        typeof this.explanation === 'string' && this.explanation !== '';
    case SURVEY:
      if (!(typeof this.question === 'string' && this.question !== '' && this.question.length < QUESTION_MAX_LENGTH)) {
        return false;
      }
      if (!this.label || (!this.label.right && !this.label.left)) return true;
      if (this.label && this.label.right && !this.label.left) return false;
      if (this.label && !this.label.right && this.label.left) return false;

      return this.label.right.length < SURVEY_LABEL_MAX_LENGTH && this.label.left.length < SURVEY_LABEL_MAX_LENGTH;
    case OPEN_QUESTION:
      return typeof this.question === 'string' && this.question !== '' && this.question.length < QUESTION_MAX_LENGTH;
    case QUESTION_ANSWER:
      return typeof this.question === 'string' && this.question !== '' && this.question.length < QUESTION_MAX_LENGTH &&
        Array.isArray(this.questionAnswers) && this.questionAnswers.length > 1 &&
        this.questionAnswers.length < QUESTION_ANSWER_MAX_ANSWERS_COUNT &&
        this.questionAnswers.every(answer => typeof answer === 'string' && answer !== '');
    default:
      return false;
  }
}

CardSchema.pre('save', save);
CardSchema.virtual('isValid').get(setIsValid);

CardSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Card', CardSchema);
module.exports.CARD_TEMPLATES = CARD_TEMPLATES;
