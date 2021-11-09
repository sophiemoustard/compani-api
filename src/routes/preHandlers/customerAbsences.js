const get = require('lodash/get');
const Boom = require('@hapi/boom');
const Customer = require('../../models/Customer');

exports.authorizeCustomerAbsenceGet = async (req) => {
  const { query } = req;
  const { credentials } = req.auth;

  const customer = await Customer.countDocuments({ _id: query.customer, company: get(credentials, 'company._id') });
  if (!customer) throw Boom.notFound();

  return null;
};
