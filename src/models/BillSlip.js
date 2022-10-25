const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const BillSlipSchema = mongoose.Schema({
  thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer', required: true },
  month: { type: String, required: true, validate: /^([0]{1}[1-9]{1}|[1]{1}[0-2]{1})-[2]{1}[0]{1}[0-9]{2}$/ },
  number: { type: String, required: true, validate: /BORD-[0-9]{12}/ },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

BillSlipSchema.pre('find', validateQuery);
BillSlipSchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => BillSlipSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('BillSlip', BillSlipSchema);
