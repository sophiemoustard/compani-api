const moment = require('moment');
const get = require('lodash/get');
const pick = require('lodash/pick');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const TaxCertificate = require('../models/TaxCertificate');

exports.generateTaxCertificatesList = async (customer, credentials) => {
  const companyId = get(credentials, 'company._id', null);

  return TaxCertificate.find({ customer, company: companyId }).lean();
};

exports.formatPdf = (taxCertificate, company) => ({
  taxCertificate: {
    company: pick(company, ['logo', 'name', 'address']),
    year: taxCertificate.year,
    date: moment(taxCertificate.year, 'YYYY')
      .add(1, 'y')
      .startOf('y')
      .endOf('month')
      .format('DD/MM/YYYY'),
    director: 'Clément de Saint Olive',
    customer: {
      name: UtilsHelper.formatIdentity(taxCertificate.customer.identity, 'TFL'),
      address: get(taxCertificate, 'customer.contact.primaryAddress', {}),
    },
  },
});

exports.generateTaxCertificatePdf = async (taxCertificateId, credentials) => {
  const taxCertificate = await TaxCertificate.findOne({ _id: taxCertificateId })
    .populate({ path: 'customer', select: 'identity contact' })
    .lean();

  const data = exports.formatPdf(taxCertificate, credentials.company);
  const pdf = await PdfHelper.generatePdf(data, './src/data/taxCertificates.html');

  return pdf;
};
