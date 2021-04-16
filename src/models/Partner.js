const mongoose = require('mongoose');
const { JOBS } = require('../helpers/constants');

const PartnerSchema = mongoose.Schema({
  identity: {
    type: mongoose.Schema({ firstname: { type: String, required: true }, lastname: { type: String, required: true } }),
    required: true,
  },
  email: { type: String },
  phone: { type: String },
  job: { type: String, enum: JOBS },
  partnerOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerOrganization', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Partner', PartnerSchema);
