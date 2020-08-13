const mongoose = require('mongoose');

const SubProgramSchema = mongoose.Schema({
  name: { type: String, required: true },
  steps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Step' }],
}, { timestamps: true });

module.exports = mongoose.model('SubProgram', SubProgramSchema);
