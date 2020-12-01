const mongoose = require('mongoose');

const CategorySchema = mongoose.Schema({
  name: { type: String, unique: true, required: true, lowercase: true },
}, { timestamps: true });

CategorySchema.virtual('programsCount', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'categories',
  count: true,
});

module.exports = mongoose.model('Category', CategorySchema);
