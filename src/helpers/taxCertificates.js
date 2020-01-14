const PdfHelper = require('./pdf');

exports.generateTaxCertificatePdf = async () => {
  const pdf = await PdfHelper.generatePdf({}, './src/data/taxCertificates.html');

  return pdf;
};
