const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Customer = require('../../models/Customer');

exports.authorizeHelpersGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id');
  const customerCount = await Customer.countDocuments({ _id: req.query.customer, company: companyId });
  if (!customerCount) throw Boom.notFound();

  return null;
};
