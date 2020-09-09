const mongoose = require('mongoose');
const { DRAFT, STATUS_TYPE } = require('../helpers/constants');

const SubProgramSchema = mongoose.Schema({
  name: { type: String, required: true },
  steps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Step' }],
  status: { type: String, required: true, default: DRAFT, enum: STATUS_TYPE },
}, { timestamps: true });

SubProgramSchema.virtual('program', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'subPrograms',
  justOne: true,
});

module.exports = mongoose.model('SubProgram', SubProgramSchema);
