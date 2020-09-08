const mongoose = require('mongoose');
const { LESSON, QUIZ, SHARING_EXPERIENCE, VIDEO } = require('../helpers/constants');

const ACTIVITY_TYPES = [LESSON, QUIZ, SHARING_EXPERIENCE, VIDEO];

const ActivitySchema = mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ACTIVITY_TYPES },
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
}, { timestamps: true });

ActivitySchema.virtual('steps', {
  ref: 'Step',
  localField: '_id',
  foreignField: 'activities',
});

module.exports = mongoose.model('Activity', ActivitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
