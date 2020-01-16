const Boom = require('boom');
const TaxCertificateHelper = require('../helpers/taxCertificates');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const { query, auth } = req;
    const taxCertificates = await TaxCertificateHelper.generateTaxCertificatesList(query.customer, auth.credentials);

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
    const pdf = await TaxCertificateHelper.generateTaxCertificatePdf(req.params._id, req.auth.credentials);

    return h.response(pdf)
      .header('content-disposition', 'inline; filename=taxcertificates.pdf')
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  generateTaxCertificatePdf,
  list,
};
