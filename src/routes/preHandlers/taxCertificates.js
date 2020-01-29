const Boom = require('boom');
const get = require('lodash/get');
const TaxCertificate = require('../../models/TaxCertificate');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getTaxCertificate = async (req) => {
  try {
    const { credentials } = req.auth;
    const taxCertificate = await TaxCertificate
      .findOne({ _id: req.params._id, company: credentials.company._id })
      .lean();
    if (!taxCertificate) throw Boom.notFound(translate[language].taxCertificateNotFound);

    return taxCertificate;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeTaxCertificatesRead = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findOne({ _id: req.query.customer, company: companyId }).lean();
  if (!customer) throw Boom.forbidden();

  return null;
};

exports.authorizeGetTaxCertificatePdf = async (req) => {
  const { credentials } = req.auth;
  const { taxCertificate } = req.pre;

  const isHelpersCustomer = credentials.scope.includes(`customer-${taxCertificate.customer.toHexString()}`);
  const canRead = credentials.scope.includes('taxcertificates:read');

  const customer = await Customer.findOne({ _id: taxCertificate.customer, company: credentials.company._id }).lean();
  if (!customer) throw Boom.forbidden();
  if (!canRead && !isHelpersCustomer) throw Boom.forbidden();

  return null;
};

exports.authorizeTaxCertificateCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findOne({ _id: req.payload.customer, company: companyId }).lean();
  if (!customer) throw Boom.forbidden();

  return null;
};
