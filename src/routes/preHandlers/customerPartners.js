const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Partner = require('../../models/Partner');
const Customer = require('../../models/Customer');
const UtilsHelper = require('../../helpers/utils');

exports.authorizeCustomerPartnerCreation = async (req) => {
  const { payload } = req;
  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');

  const partner = await Partner.findOne({ _id: payload.partner }, { company: 1 }).lean();
  const customer = await Customer.findOne({ _id: payload.customer }, { company: 1 }).lean();
  if (!(partner && customer)) throw Boom.notFound();

  const areCompanyIdsEquals = UtilsHelper.areObjectIdsEquals(partner.company, customer.company) &&
    UtilsHelper.areObjectIdsEquals(partner.company, loggedUserCompany);
  if (!areCompanyIdsEquals) throw Boom.forbidden();

  return null;
};

exports.authorizeCustomerPartnersGet = async (req) => {
  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');

  const customer = await Customer.findOne({ _id: req.query.customer }, { company: 1 }).lean();
  if (!customer) throw Boom.notFound();

  if (!UtilsHelper.areObjectIdsEquals(customer.company, loggedUserCompany)) throw Boom.forbidden();

  return null;
};
