const get = require('lodash/get');
const Boom = require('@hapi/boom');
const Customer = require('../../models/Customer');

exports.checkCustomerNoteCreation = async (req) => {
  const { payload } = req;
  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');

  const user = await Customer.countDocuments({ _id: payload.customer, company: loggedUserCompany });
  if (!user) throw Boom.notFound();

  return null;
};

exports.checkCustomerNoteGet = async (req) => {
  const { query } = req;
  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');

  const user = await Customer.countDocuments({ _id: query.customer, company: loggedUserCompany });
  if (!user) throw Boom.notFound();

  return null;
};
