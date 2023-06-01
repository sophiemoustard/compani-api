const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const UserHoldingSchema = mongoose.Schema({
  holding: { type: mongoose.Schema.Types.ObjectId, ref: 'Holding', required: true, immutable: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
}, { timestamps: true });

queryMiddlewareList.map(middleware => UserHoldingSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('UserHolding', UserHoldingSchema);
