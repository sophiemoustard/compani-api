const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const {
  LESSON,
  QUIZ,
  SHARING_EXPERIENCE,
  VIDEO,
  DRAFT,
  CARD_TEMPLATES,
} = require('../helpers/constants');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');
const { STATUS_TYPES } = require('./SubProgram');

const ACTIVITY_TYPES = [LESSON, QUIZ, SHARING_EXPERIENCE, VIDEO];

const ActivitySchema = mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ACTIVITY_TYPES },
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
  status: { type: String, default: DRAFT, enum: STATUS_TYPES },
}, { timestamps: true, id: false });

ActivitySchema.virtual('steps', {
  ref: 'Step',
  localField: '_id',
  foreignField: 'activities',
});

ActivitySchema.virtual('activityHistories', {
  ref: 'ActivityHistory',
  localField: '_id',
  foreignField: 'activity',
  sort: { date: -1 },
});

// eslint-disable-next-line consistent-return
function setQuizCount() {
  if (this.cards && this.cards.length && this.cards[0].template) {
    const quizTemplates = CARD_TEMPLATES.filter(temp => temp.type === QUIZ).map(temp => temp.value);
    return this.cards.filter(card => quizTemplates.includes(card.template)).length;
  }
}

ActivitySchema.virtual('quizCount').get(setQuizCount);

// eslint-disable-next-line consistent-return
function setAreCardsValid() {
  if (!this.cards || this.cards.length === 0) return false;

  if (this.cards && this.cards.length && this.cards[0].template) { // if card is populated, template exists
    return this.cards.every(card => card.isValid);
  }
}

ActivitySchema.virtual('areCardsValid').get(setAreCardsValid);
queryMiddlewareList.map(middleware => ActivitySchema.pre(middleware, formatQuery));

ActivitySchema.plugin(mongooseLeanVirtuals);
module.exports = mongoose.model('Activity', ActivitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
