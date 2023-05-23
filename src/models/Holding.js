const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const HoldingSchema = mongoose.Schema({
  name: { type: String, required: true },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }) },
}, { timestamps: true });

queryMiddlewareList.map(middleware => HoldingSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Holding', HoldingSchema);
