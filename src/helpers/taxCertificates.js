const get = require('lodash/get');
const pick = require('lodash/pick');
const Boom = require('@hapi/boom');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const SubscriptionsHelper = require('./subscriptions');
const moment = require('../extensions/moment');
const GDriveStorageHelper = require('./gDriveStorage');
const TaxCertificate = require('../models/TaxCertificate');
const EventRepository = require('../repositories/EventRepository');
const PaymentRepository = require('../repositories/PaymentRepository');
const TaxCertificatePdf = require('../data/pdf/taxCertificates');
const NumbersHelper = require('./numbers');

exports.list = async (customer, credentials) =>
  TaxCertificate.find({ customer, company: get(credentials, 'company._id') }).lean();

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
    taxCertificate: {
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

  const template = await TaxCertificatePdf.getPdfContent(
    exports.formatPdf(taxCertificate, credentials.company, interventions, payments)
  );
  const pdf = await PdfHelper.generatePdf(template);

  return pdf;
};

exports.remove = async (taxCertificateId) => {
  const taxCertificate = await TaxCertificate.findOneAndDelete({ _id: taxCertificateId }).lean();
  if (taxCertificate.driveFile) await GDriveStorageHelper.deleteFile(taxCertificate.driveFile.driveId);
};

exports.create = async (certificatePayload, credentials) => {
  const uploadedFile = await GDriveStorageHelper.addFile({
    driveFolderId: certificatePayload.driveFolderId,
    name: certificatePayload.fileName || certificatePayload.taxCertificate.hapi.fileName,
    type: certificatePayload.mimeType,
    body: certificatePayload.taxCertificate,
  });
  if (!uploadedFile) throw Boom.failedDependency('Google drive: File not uploaded');

  const { id: driveId, webViewLink: link } = uploadedFile;
  const taxCertificate = await TaxCertificate.create({
    company: get(credentials, 'company._id', null),
    date: certificatePayload.date,
    year: certificatePayload.year,
    customer: certificatePayload.customer,
    driveFile: { driveId, link },
  });

  return taxCertificate.toObject();
};
