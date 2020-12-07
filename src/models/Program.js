const mongoose = require('mongoose');

const ProgramSchema = mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  learningGoals: { type: String },
  subPrograms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubProgram' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  image: {
    publicId: String,
    link: { type: String, trim: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('Program', ProgramSchema);
