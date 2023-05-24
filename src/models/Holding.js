const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const HoldingSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  address: { type: String },
}, { timestamps: true });

queryMiddlewareList.map(middleware => HoldingSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Holding', HoldingSchema);
