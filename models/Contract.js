const mongoose = require('mongoose');

const ContractSchema = mongoose.Schema({
  startDate: Date,
  endDate: Date,
  endReason: String,
  otherMisc: String,
  endNotificationDate: Date,
  status: String,
  ogustContractId: String,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  versions: [{
    ogustContractId: String,
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

