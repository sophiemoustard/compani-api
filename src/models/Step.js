const mongoose = require('mongoose');
const { E_LEARNING, ON_SITE } = require('../helpers/constants');

const STEP_TYPES = [E_LEARNING, ON_SITE];

const StepSchema = mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: STEP_TYPES },
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
}, { timestamps: true });

StepSchema.virtual('subProgram', {
  ref: 'SubProgram',
  localField: '_id',
  foreignField: 'steps',
  justOne: true,
});

module.exports = mongoose.model('Step', StepSchema);
module.exports.STEP_TYPES = STEP_TYPES;
