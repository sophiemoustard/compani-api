const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const SectorHistorySchema = mongoose.Schema({
  sector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector',
    autopopulate: { select: '_id name' },
    required: true,
  },
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });

SectorHistorySchema.pre('aggregate', validateAggregation);
SectorHistorySchema.pre('find', validateQuery);
formatQueryMiddlewareList().map(middleware => SectorHistorySchema.pre(middleware, formatQuery));

SectorHistorySchema.plugin(autopopulate);

module.exports = mongoose.model('SectorHistory', SectorHistorySchema);
