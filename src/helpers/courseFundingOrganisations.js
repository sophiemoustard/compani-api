const has = require('lodash/has');
const CourseFundingOrganisation = require('../models/CourseFundingOrganisation');

exports.list = async credentials => CourseFundingOrganisation
  .find()
  .populate({ path: 'courseBillCount', options: { isVendorUser: has(credentials, 'role.vendor') } })
  .lean({ virtuals: true });

exports.create = async payload => CourseFundingOrganisation.create(payload);

exports.remove = async params => CourseFundingOrganisation.deleteOne(params);
