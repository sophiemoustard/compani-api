const mongoose = require('mongoose');

const {
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
  EMPLOYER_TRIAL_PERIOD_TERMINATION,
  EMPLOYEE_TRIAL_PERIOD_TERMINATION,
  RESIGNATION,
  SERIOUS_MISCONDUCT_LAYOFF,
  GROSS_FAULT_LAYOFF,
  OTHER_REASON_LAYOFF,
  MUTATION,
  CONTRACTUAL_TERMINATION,
  INTERNSHIP_END,
  CDD_END,
  OTHER,
} = require('../helpers/constants');
const driveFileSchemaDefinition = require('./schemaDefinitions/driveFile');

const CONTRACT_STATUS = [CUSTOMER_CONTRACT, COMPANY_CONTRACT];
const END_CONTRACT_REAONS = [EMPLOYER_TRIAL_PERIOD_TERMINATION, EMPLOYEE_TRIAL_PERIOD_TERMINATION, RESIGNATION,
  SERIOUS_MISCONDUCT_LAYOFF, GROSS_FAULT_LAYOFF, OTHER_REASON_LAYOFF, MUTATION, CONTRACTUAL_TERMINATION,
  INTERNSHIP_END, CDD_END, OTHER];

const ContractSchema = mongoose.Schema({
  startDate: Date,
  endDate: Date,
  endReason: { type: String, enum: END_CONTRACT_REAONS },
  otherMisc: String,
  endNotificationDate: Date,
  status: { type: String, enum: CONTRACT_STATUS },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  versions: [{
    signature: {
      eversignId: String,
      signedBy: {
        auxiliary: { type: Boolean, default: false },
        other: { type: Boolean, default: false },
      },
    },
    createdAt: { type: Date, default: Date.now },
    startDate: Date,
    endDate: Date,
    weeklyHours: Number,
    grossHourlyRate: Number,
    isActive: { type: Boolean, default: false },
    customerDoc: driveFileSchemaDefinition,
    auxiliaryDoc: driveFileSchemaDefinition,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Contract', ContractSchema);
module.exports.CONTRACT_STATUS = CONTRACT_STATUS;
module.exports.END_CONTRACT_REAONS = END_CONTRACT_REAONS;
