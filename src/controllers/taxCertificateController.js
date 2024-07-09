const Boom = require('@hapi/boom');
const get = require('lodash/get');
const TaxCertificateHelper = require('../helpers/taxCertificates');

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

module.exports = { generateTaxCertificatePdf };
