const mongoose = require('mongoose');
const { formatQuery } = require('./preHooks/validate');

const CategorySchema = mongoose.Schema({
  name: { type: String, unique: true, required: true, lowercase: true },
}, { timestamps: true });

CategorySchema.virtual('programsCount', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'categories',
  count: true,
});

CategorySchema.pre('countDocuments', formatQuery);
CategorySchema.pre('find', formatQuery);
CategorySchema.pre('findOne', formatQuery);

module.exports = mongoose.model('Category', CategorySchema);
