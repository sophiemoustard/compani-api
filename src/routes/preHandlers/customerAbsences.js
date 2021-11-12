const get = require('lodash/get');
const Boom = require('@hapi/boom');
const UtilsHelper = require('../../helpers/utils');
const Customer = require('../../models/Customer');

exports.authorizeCustomerAbsenceGet = async (req) => {
  const { credentials } = req.auth;
  const companyId = get(credentials, 'company._id');

  const customers = UtilsHelper.formatIdsArray(req.query.customer);
  const customerCount = await Customer.countDocuments({ _id: { $in: customers }, company: companyId });
  if (customerCount !== customers.length) throw Boom.notFound();

  return null;
};
