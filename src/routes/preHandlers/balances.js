const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Customer = require('../../models/Customer');

exports.authorizeGetDetails = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.countDocuments({ _id: req.query.customer, company: companyId });
  if (!customer) throw Boom.notFound();

  return null;
};
