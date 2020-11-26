const mongoose = require('mongoose');

const CategorySchema = mongoose.Schema({
  name: { type: String, unique: true, required: true, lowercase: true },
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);
