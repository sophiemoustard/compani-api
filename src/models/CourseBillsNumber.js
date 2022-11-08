const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const CourseBillsNumberSchema = mongoose.Schema({
  seq: { type: Number, default: 1 },
}, { timestamps: true });

queryMiddlewareList.map(middleware => CourseBillsNumberSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseBillsNumber', CourseBillsNumberSchema);
