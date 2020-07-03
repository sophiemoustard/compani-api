const mongoose = require('mongoose');

const ProgramSchema = mongoose.Schema({
  name: { type: String, required: true },
  learningGoals: { type: String },
  modules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
}, { timestamps: true });

module.exports = mongoose.model('Program', ProgramSchema);

