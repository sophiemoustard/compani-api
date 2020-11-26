const mongoose = require('mongoose');
const { validateQuery, validateAggregation, validateUpdateOne } = require('./preHooks/validate');

const ContractNumberSchema = mongoose.Schema({
  seq: { type: Number, default: 0 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

ContractNumberSchema.pre('find', validateQuery);
ContractNumberSchema.pre('aggregate', validateAggregation);
ContractNumberSchema.pre('updateOne', validateUpdateOne);

module.exports = mongoose.model('ContractNumber', ContractNumberSchema);
