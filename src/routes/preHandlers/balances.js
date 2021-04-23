const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Customer = require('../../models/Customer');

exports.authorizeGetDetails = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findOne({ _id: req.query.customer, company: companyId }).lean();
  if (!customer) throw Boom.forbidden();

  return null;
};
