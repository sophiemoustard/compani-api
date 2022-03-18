const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Customer = require('../../models/Customer');
const Helper = require('../../models/Helper');

exports.authorizeHelpersGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id');
  const customerCount = await Customer.countDocuments({ _id: req.query.customer, company: companyId });
  if (!customerCount) throw Boom.notFound();

  return null;
};

exports.authorizeHelperUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id');
  const helperCount = await Helper.countDocuments({ _id: req.params._id, company: companyId });
  if (!helperCount) throw Boom.notFound();

  return null;
};
