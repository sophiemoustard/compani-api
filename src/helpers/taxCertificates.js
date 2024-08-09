const get = require('lodash/get');
const pick = require('lodash/pick');
const UtilsHelper = require('./utils');
const SubscriptionsHelper = require('./subscriptions');
const moment = require('../extensions/moment');
const TaxCertificate = require('../models/TaxCertificate');
const EventRepository = require('../repositories/EventRepository');
const PaymentRepository = require('../repositories/PaymentRepository');
const TaxCertificatePdf = require('../data/pdf/taxCertificates');
const NumbersHelper = require('./numbers');

exports.formatInterventions = interventions => interventions.map((int) => {
  const service = SubscriptionsHelper.populateService(int.subscription.service);

  return {
    auxiliary: UtilsHelper.formatIdentity(int.auxiliary.identity, 'FL'),
    serialNumber: int.auxiliary.serialNumber,
    subscription: service.name,
    month: UtilsHelper.capitalize(moment(int.month, 'M').format('MMMM')),
    hours: UtilsHelper.formatHour(int.duration),
  };
});

exports.formatPdf = (taxCertificate, company, interventions, payments) => {
  const formattedInterventions = exports.formatInterventions(interventions);
  const subscriptions = new Set(formattedInterventions.map(int => int.subscription));
  const totalHours = interventions
    .reduce((acc, int) => NumbersHelper.add(acc, int.duration), NumbersHelper.toString(0));
  const totalPaid = payments ? NumbersHelper.add(payments.paid, payments.cesu) : 0;

  return {
    totalHours: UtilsHelper.formatHour(NumbersHelper.toFixedToFloat(totalHours)),
    totalPaid: UtilsHelper.formatPrice(NumbersHelper.toFixedToFloat(totalPaid)),
    cesu: payments && !NumbersHelper.isEqualTo(payments.cesu, '0')
      ? UtilsHelper.formatPrice(NumbersHelper.toFixedToFloat(payments.cesu))
      : 0,
    subscriptions: [...subscriptions].join(', '),
    interventions: formattedInterventions,
    company: {
      ...pick(company, ['logo', 'name', 'address', 'rcs']),
      legalRepresentative: {
        name: UtilsHelper.formatIdentity(company.legalRepresentative, 'FL'),
        position: get(company, 'legalRepresentative.position') || '',
      },
    },
    year: taxCertificate.year,
    date: moment(taxCertificate.date).format('DD/MM/YYYY'),
    customer: {
      name: UtilsHelper.formatIdentity(taxCertificate.customer.identity, 'TFL'),
      address: get(taxCertificate, 'customer.contact.primaryAddress', {}),
    },
  };
};

exports.generateTaxCertificatePdf = async (taxCertificateId, credentials) => {
  const companyId = get(credentials, 'company._id');
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
  const pdf = await TaxCertificatePdf.getPdf(data);

  return { pdf, filename: `attestation_fiscale_${taxCertificate.year}` };
};
