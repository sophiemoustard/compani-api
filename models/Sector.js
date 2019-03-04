const mongoose = require('mongoose');

const SectorsSchema = mongoose.Schema({
  name: String,
  company: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

module.exports = mongoose.model('Sector', SectorsSchema);
