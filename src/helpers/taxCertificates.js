const moment = require('moment');
const get = require('lodash/get');
const pick = require('lodash/pick');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const TaxCertificate = require('../models/TaxCertificate');
const Company = require('../models/Company');

exports.generateTaxCertificatesList = async (customer, credentials) => {
  const companyId = get(credentials, 'company._id', null);

  return TaxCertificate.find({ customer, company: companyId }).lean();
};

exports.generateTaxCertificatePdf = async (taxCertificateId, credentials) => {
  const company = await Company.findOne({ _id: get(credentials, 'company._id', null) }).lean();
  const taxCertificate = await TaxCertificate.findOne({ _id: taxCertificateId })
    .populate({ path: 'customer', select: 'identity contact' })
    .lean();

  const data = {
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
        name: UtilsHelper.formatCustomerName(taxCertificate.customer),
        address: get(taxCertificate, 'customer.contact.primaryAddress', {}),
      },
    },
  };
  const pdf = await PdfHelper.generatePdf(data, './src/data/taxCertificates.html');

  return pdf;
};
