const PdfHelper = require('./pdf');
const get = require('lodash/get');
const TaxCertificate = require('../models/TaxCertificate');

exports.generateTaxCertificatesList = async (customer, cerdentials) => {
  const companyId = get(cerdentials, 'company._id', null);

  return TaxCertificate.find({ customer, company: companyId }).lean();
};

exports.generateTaxCertificatePdf = async () => {
  const pdf = await PdfHelper.generatePdf({}, './src/data/taxCertificates.html');

  return pdf;
};
