const Boom = require('boom');
const TaxCertificateHelper = require('../helpers/taxCertificates');

const generateTaxCertificatePdf = async (req, h) => {
  try {
    const pdf = await TaxCertificateHelper.generateTaxCertificatePdf(req.params, req.auth.credentials);

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
};
