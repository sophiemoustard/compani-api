const mongoose = require('mongoose');

const SubProgramSchema = mongoose.Schema({
  name: { type: String, required: true },
  steps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Step' }],
}, { timestamps: true });

SubProgramSchema.virtual('program', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'subPrograms',
  justOne: true,
});

module.exports = mongoose.model('SubProgram', SubProgramSchema);
