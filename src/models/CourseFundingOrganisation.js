const mongoose = require('mongoose');
const { formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CourseFundingOrganisationSchema = mongoose.Schema({
  // unique mongo index on 'name' (with case and diacritics insensitive collation) has been added manually in mep58
  name: { type: String, required: true },
  address: { type: String, required: true },
}, { timestamps: true });

CourseFundingOrganisationSchema.virtual('courseBillCount', {
  ref: 'CourseBill',
  localField: '_id',
  foreignField: 'payer.fundingOrganisation',
  count: true,
});

formatQueryMiddlewareList().map(middleware => CourseFundingOrganisationSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseFundingOrganisation', CourseFundingOrganisationSchema);
