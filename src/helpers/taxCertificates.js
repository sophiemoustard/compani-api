const moment = require('moment');
const get = require('lodash/get');
const pick = require('lodash/pick');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const SubscriptionsHelper = require('./subscriptions');
const TaxCertificate = require('../models/TaxCertificate');
const EventRepository = require('../repositories/EventRepository');

exports.generateTaxCertificatesList = async (customer, credentials) => {
  const companyId = get(credentials, 'company._id', null);

  return TaxCertificate.find({ customer, company: companyId }).lean();
};

exports.formatInterventions = interventions => interventions.map((int) => {
  const service = SubscriptionsHelper.populateService(int.subscription.service);

  return {
    auxiliary: UtilsHelper.formatIdentity(int.auxiliary.identity, 'FL'),
    subscription: service.name,
    month: UtilsHelper.capitalize(moment(int.month, 'M').format('MMMM')),
    hours: UtilsHelper.formatHour(int.duration),
  };
});

exports.formatPdf = (taxCertificate, company, interventions) => {
  const formattedInterventions = exports.formatInterventions(interventions, taxCertificate.customer);
  const subscriptions = new Set(formattedInterventions.map(int => int.subscription));
  let totalHours = 0;
  for (const int of interventions) {
    totalHours += int.duration;
  }

  return {
    taxCertificate: {
      totalHours: UtilsHelper.formatHour(totalHours),
      subscriptions: [...subscriptions].join(','),
      interventions: formattedInterventions,
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

  const data = exports.formatPdf(taxCertificate, credentials.company, interventions);
  const pdf = await PdfHelper.generatePdf(data, './src/data/taxCertificates.html');

  return pdf;
};
