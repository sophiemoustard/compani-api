const mongoose = require('mongoose');
const { validatePayload } = require('./preHooks/validate');

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
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');

const CONTRACT_STATUS = [CUSTOMER_CONTRACT, COMPANY_CONTRACT];
const END_CONTRACT_REASONS = [
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
];

const ContractSchema = mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  endReason: { type: String, enum: END_CONTRACT_REASONS },
  otherMisc: String,
  endNotificationDate: { type: Date },
  status: { type: String, enum: CONTRACT_STATUS, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  versions: [{
    signature: {
      eversignId: String,
      signedBy: {
        auxiliary: { type: Boolean, default: false },
        other: { type: Boolean, default: false },
      },
    },
    createdAt: { type: Date, default: Date.now },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    weeklyHours: { type: Number },
    grossHourlyRate: { type: Number, required: true },
    customerDoc: driveResourceSchemaDefinition,
    auxiliaryDoc: driveResourceSchemaDefinition,
    customerArchives: [driveResourceSchemaDefinition],
    auxiliaryArchives: [driveResourceSchemaDefinition],
  }],
}, {
  timestamps: true,
});

ContractSchema.pre('validate', validatePayload);
module.exports = mongoose.model('Contract', ContractSchema);
module.exports.CONTRACT_STATUS = CONTRACT_STATUS;
module.exports.END_CONTRACT_REASONS = END_CONTRACT_REASONS;
