const Boom = require('@hapi/boom');
const get = require('lodash/get');
const TaxCertificate = require('../../models/TaxCertificate');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getTaxCertificate = async (req) => {
  try {
    const taxCertificate = await TaxCertificate
      .findOne({ _id: req.params._id, company: get(req, 'auth.credentials.company._id') })
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
  const customer = await Customer.countDocuments({ _id: req.query.customer, company: companyId });
  if (!customer) throw Boom.notFound();

  return null;
};

exports.authorizeGetTaxCertificatePdf = async (req) => {
  const { credentials } = req.auth;
  const { taxCertificate } = req.pre;

  const isHelpersCustomer = credentials.scope.includes(`customer-${taxCertificate.customer.toHexString()}`);
  const canRead = credentials.scope.includes('taxcertificates:read');
  if (!canRead && !isHelpersCustomer) throw Boom.forbidden();

  const customer = await Customer.countDocuments({ _id: taxCertificate.customer, company: credentials.company._id });
  if (!customer) throw Boom.notFound();

  return null;
};

exports.authorizeTaxCertificateCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.countDocuments({ _id: req.payload.customer, company: companyId });
  if (!customer) throw Boom.notFound();

  return null;
};
