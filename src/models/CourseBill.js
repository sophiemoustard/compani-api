const mongoose = require('mongoose');
const get = require('lodash/get');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CourseBillSchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  mainFee: {
    price: { type: Number, required: true },
    count: { type: Number, required: true },
    description: { type: String },
  },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  payer: {
    type: mongoose.Schema({
      fundingOrganisation: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseFundingOrganisation' },
      company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    }, { _id: false, id: false }),
  },
  billingPurchaseList: {
    type: [mongoose.Schema({
      billingItem: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseBillingItem', required: true },
      price: { type: Number, required: true },
      count: { type: Number, required: true },
      description: { type: String },
    }
    )],
  },
  billedAt: { type: Date, required() { return !!this.number; } },
  number: { type: String, required() { return !!this.billedAt; } },
}, { timestamps: true });

function formatPayer(doc, next) {
  // eslint-disable-next-line no-param-reassign
  if (get(doc, 'payer.company')) doc.payer = doc.payer.company;
  // eslint-disable-next-line no-param-reassign
  if (get(doc, 'payer.fundingOrganisation')) doc.payer = doc.payer.fundingOrganisation;

  return next();
}

function formatPayers(docs, next) {
  for (const doc of docs) {
    if (get(doc, 'payer.company')) doc.payer = doc.payer.company;
    if (get(doc, 'payer.fundingOrganisation')) doc.payer = doc.payer.fundingOrganisation;
  }

  return next();
}

CourseBillSchema.virtual('coursePayments', { ref: 'CoursePayment', localField: '_id', foreignField: 'courseBill' });

CourseBillSchema.virtual(
  'courseCreditNote',
  { ref: 'CourseCreditNote', localField: '_id', foreignField: 'courseBill', justOne: true }
);

CourseBillSchema.pre('find', validateQuery);
CourseBillSchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => CourseBillSchema.pre(middleware, formatQuery));

CourseBillSchema.post('find', formatPayers);
CourseBillSchema.post('findOne', formatPayer);
CourseBillSchema.post('findOneAndUpdate', formatPayer);

module.exports = mongoose.model('CourseBill', CourseBillSchema);
