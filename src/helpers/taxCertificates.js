const get = require('lodash/get');
const pick = require('lodash/pick');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const SubscriptionsHelper = require('./subscriptions');
const moment = require('../extensions/moment');
const TaxCertificate = require('../models/TaxCertificate');
const EventRepository = require('../repositories/EventRepository');
const PaymentRepository = require('../repositories/PaymentRepository');

exports.generateTaxCertificatesList = async (customer, credentials) => {
  const companyId = get(credentials, 'company._id', null);

  return TaxCertificate.find({ customer, company: companyId }).lean();
};

exports.formatInterventions = interventions => interventions.map((int) => {
  const service = SubscriptionsHelper.populateService(int.subscription.service);

  return {
    auxiliary: UtilsHelper.formatIdentity(int.auxiliary.identity, 'FL'),
    subscription: service.name,
    month: moment(int.month, 'M').format('MMMM'),
    hours: UtilsHelper.formatHour(int.duration),
  };
});

exports.formatPdf = (taxCertificate, company, interventions, payments) => {
  const formattedInterventions = exports.formatInterventions(interventions);
  const subscriptions = new Set(formattedInterventions.map(int => int.subscription));
  const totalHours = interventions.reduce((acc, int) => acc + int.duration, 0);

  return {
    taxCertificate: {
      totalHours: UtilsHelper.formatHour(totalHours),
      totalPaid: UtilsHelper.formatPrice(payments.paid + payments.cesu),
      cesu: UtilsHelper.formatPrice(payments.cesu),
      subscriptions: [...subscriptions].join(', '),
      interventions: formattedInterventions,
      company: pick(company, ['logo', 'name', 'address']),
      year: taxCertificate.year,
      date: moment(taxCertificate.year, 'YYYY')
        .add(1, 'y')
        .startOf('y')
        .endOf('month')
        .format('DD/MM/YYYY'),
      director: 'Clément Saint Olive',
      customer: {
        name: UtilsHelper.formatIdentity(taxCertificate.customer.identity, 'TFL'),
        address: get(taxCertificate, 'customer.contact.primaryAddress', {}),
      },
    },
  };
};

exports.generateTaxCertificatePdf = async (taxCertificateId, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const taxCertificate = await TaxCertificate.findOne({ _id: taxCertificateId })
    .populate({
      path: 'customer',
      select: 'identity contact subscriptions',
      populate: { path: 'subscriptions.service' },
    })
    .lean();
  const interventions = await EventRepository.getTaxCertificateInterventions(taxCertificate, companyId);
  const payments = await PaymentRepository.getTaxCertificatesPayments(taxCertificate, companyId);

  const data = exports.formatPdf(taxCertificate, credentials.company, interventions, payments);
  const pdf = await PdfHelper.generatePdf(data, './src/data/taxCertificates.html');

  return pdf;
};
