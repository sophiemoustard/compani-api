const Boom = require('@hapi/boom');
const get = require('lodash/get');
const TaxCertificateHelper = require('../helpers/taxCertificates');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const { query, auth } = req;
    const taxCertificates = await TaxCertificateHelper.list(query.customer, auth.credentials);

    return {
      data: { taxCertificates },
      message: taxCertificates.length
        ? translate[language].taxCertificatesFound
        : translate[language].taxCertificatesNotFound,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const generateTaxCertificatePdf = async (req, h) => {
  try {
    req.log('taxCertificateController - generateTaxCertificatePdf - params', req.params);
    req.log('taxCertificateController - generateTaxCertificatePdf - company', get(req, 'auth.credentials.company._id'));

    const { pdf, filename } = await TaxCertificateHelper
      .generateTaxCertificatePdf(req.params._id, req.auth.credentials);

    return h.response(pdf)
      .header('content-disposition', `inline; filename=${filename}.pdf`)
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const taxCertificate = await TaxCertificateHelper.create(req.payload, req.auth.credentials);

    return {
      message: translate[language].taxCertificateCreated,
      data: { taxCertificate },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await TaxCertificateHelper.remove(req.params._id);

    return { message: translate[language].taxCertificateDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { generateTaxCertificatePdf, list, create, remove };
