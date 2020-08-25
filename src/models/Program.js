const mongoose = require('mongoose');

const ProgramSchema = mongoose.Schema({
  name: { type: String, required: true },
  learningGoals: { type: String },
  subPrograms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubProgram' }],
  steps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Step' }],
  image: {
    publicId: String,
    link: { type: String, trim: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('Program', ProgramSchema);
