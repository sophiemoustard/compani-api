const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Partner = require('../../models/Partner');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');
const CustomerPartner = require('../../models/CustomerPartner');

const { language } = translate;

exports.authorizeCustomerPartnerCreation = async (req) => {
  const { payload } = req;
  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');

  const partner = await Partner.countDocuments({ _id: payload.partner, company: loggedUserCompany });
  const customer = await Customer.countDocuments({ _id: payload.customer, company: loggedUserCompany });
  if (!partner || !customer) throw Boom.notFound();

  const customerPartner = await CustomerPartner
    .countDocuments({ partner: payload.partner, customer: payload.customer });
  if (customerPartner) throw Boom.conflict(translate[language].customerPartnerAlreadyExists);

  return null;
};

exports.authorizeCustomerPartnersGet = async (req) => {
  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');

  const customer = await Customer.countDocuments({ _id: req.query.customer, company: loggedUserCompany });
  if (!customer) throw Boom.notFound();
  return null;
};

exports.authorizeCustomerPartnersUpdate = async (req) => {
  const customerPartner = await CustomerPartner.countDocuments({ _id: req.params._id });
  if (!customerPartner) throw Boom.notFound();

  return null;
};
