const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CourseBillSchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  mainFee: {
    price: { type: Number, required: true },
    count: { type: Number, required: true },
    description: { type: String },
  },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  courseFundingOrganisation: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseFundingOrganisation' },
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

CourseBillSchema.virtual('coursePayments', { ref: 'CoursePayment', localField: '_id', foreignField: 'courseBill' });

CourseBillSchema.virtual('courseCreditNote', {
  ref: 'CourseCreditNote',
  localField: '_id',
  foreignField: 'courseBill',
  justOne: true,
});

CourseBillSchema.pre('find', validateQuery);
CourseBillSchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => CourseBillSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseBill', CourseBillSchema);
