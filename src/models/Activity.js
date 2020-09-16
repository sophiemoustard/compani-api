const mongoose = require('mongoose');
const { LESSON, QUIZ, SHARING_EXPERIENCE, VIDEO, DRAFT, STATUS_TYPE } = require('../helpers/constants');

const ACTIVITY_TYPES = [LESSON, QUIZ, SHARING_EXPERIENCE, VIDEO];

const ActivitySchema = mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ACTIVITY_TYPES },
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
  status: { type: String, default: DRAFT, enum: STATUS_TYPE },
}, { timestamps: true });

ActivitySchema.virtual('steps', {
  ref: 'Step',
  localField: '_id',
  foreignField: 'activities',
});

ActivitySchema.virtual('activityHistories', {
  ref: 'ActivityHistory',
  localField: '_id',
  foreignField: 'activity',
  sort: { date: 1 },
});

module.exports = mongoose.model('Activity', ActivitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
