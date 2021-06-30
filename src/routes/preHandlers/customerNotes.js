const get = require('lodash/get');
const Boom = require('@hapi/boom');
const Customer = require('../../models/Customer');
const CustomerNote = require('../../models/CustomerNote');

exports.authorizeCustomerNoteCreation = async (req) => {
  const { payload } = req;
  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');

  const customer = await Customer.countDocuments({ _id: payload.customer, company: loggedUserCompany });
  if (!customer) throw Boom.notFound();

  return null;
};

exports.authorizeCustomerNoteGet = async (req) => {
  const { query } = req;
  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');

  const customer = await Customer.countDocuments({ _id: query.customer, company: loggedUserCompany });
  if (!customer) throw Boom.notFound();

  return null;
};

exports.authorizeCustomerNoteEdit = async (req) => {
  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');

  const note = await CustomerNote.countDocuments({ _id: req.params._id, company: loggedUserCompany });
  if (!note) throw Boom.notFound();

  return null;
};
