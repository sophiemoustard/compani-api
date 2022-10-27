const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const CategorySchema = mongoose.Schema({
  name: { type: String, unique: true, required: true, lowercase: true },
}, { timestamps: true });

CategorySchema.virtual('programsCount', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'categories',
  count: true,
});

queryMiddlewareList.map(middleware => CategorySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Category', CategorySchema);
