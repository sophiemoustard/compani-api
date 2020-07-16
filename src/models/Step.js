const mongoose = require('mongoose');

const StepSchema = mongoose.Schema({
  title: { type: String, required: true },
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
}, { timestamps: true });

module.exports = mongoose.model('Step', StepSchema);
