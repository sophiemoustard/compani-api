const mongoose = require('mongoose');

const CategorySchema = mongoose.Schema({
  name: { type: String, unique: true, required: true, lowercase: true },
}, { timestamps: true });

CategorySchema.virtual('programs', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'categories',
});

module.exports = mongoose.model('Category', CategorySchema);
