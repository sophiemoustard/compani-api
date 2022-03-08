const mongoose = require('mongoose');
const { formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CourseBillsNumberSchema = mongoose.Schema({
  seq: { type: Number, default: 1 },
}, { timestamps: true });

formatQueryMiddlewareList().map(middleware => CourseBillsNumberSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseBillsNumberSchema', CourseBillsNumberSchema);
