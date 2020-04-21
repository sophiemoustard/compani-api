const mongoose = require('mongoose');

const ProgramSchema = mongoose.Schema({
  name: { type: String, required: true },
  learningGoals: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Program', ProgramSchema);

