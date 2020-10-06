const mongoose = require('mongoose');
const { DRAFT, PUBLISHED } = require('../helpers/constants');

const STATUS_TYPES = [DRAFT, PUBLISHED];

const SubProgramSchema = mongoose.Schema({
  name: { type: String, required: true },
  steps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Step' }],
  status: { type: String, default: DRAFT, enum: STATUS_TYPES },
}, { timestamps: true });

SubProgramSchema.virtual('program', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'subPrograms',
  justOne: true,
});

module.exports = mongoose.model('SubProgram', SubProgramSchema);
module.exports.STATUS_TYPES = STATUS_TYPES;
