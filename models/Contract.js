const mongoose = require('mongoose');

const { CUSTOMER_CONTRACT, COMPANY_CONTRACT } = require('../helpers/constants');

const ContractSchema = mongoose.Schema({
  startDate: Date,
  endDate: Date,
  endReason: String,
  otherMisc: String,
  endNotificationDate: Date,
  status: { type: String, enum: [CUSTOMER_CONTRACT, COMPANY_CONTRACT] },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  versions: [{
    signature: {
      eversignId: String,
      signedBy: {
        auxiliary: { type: Boolean, default: false },
        other: { type: Boolean, default: false },
      }
    },
    createdAt: { type: Date, default: Date.now },
    startDate: Date,
    endDate: Date,
    weeklyHours: Number,
    grossHourlyRate: Number,
    isActive: { type: Boolean, default: false },
    link: String,
    driveId: String
  }]
}, {
  timestamps: true,
});

module.exports = mongoose.model('Contract', ContractSchema);

