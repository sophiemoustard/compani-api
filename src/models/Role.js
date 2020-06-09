const mongoose = require('mongoose');
const { VENDOR, CLIENT } = require('../helpers/constants');

const INTERFACE_TYPES = [CLIENT, VENDOR];

const RoleSchema = mongoose.Schema({
  name: { type: String, unique: true, required: true },
  interface: { type: String, enum: INTERFACE_TYPES, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
