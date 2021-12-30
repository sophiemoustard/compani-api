const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const ReferentHistorySchema = mongoose.Schema({
  auxiliary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    autopopulate: { select: '_id identity picture contact' },
    required: true,
  },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });

ReferentHistorySchema.pre('aggregate', validateAggregation);
ReferentHistorySchema.pre('find', validateQuery);
formatQueryMiddlewareList().map(middleware => ReferentHistorySchema.pre(middleware, formatQuery));

ReferentHistorySchema.plugin(autopopulate);

module.exports = mongoose.model('ReferentHistory', ReferentHistorySchema);
