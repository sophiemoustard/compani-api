const flat = require('flat');
const Boom = require('@hapi/boom');
const crypto = require('crypto');
const moment = require('moment');
const get = require('lodash/get');
const keyBy = require('lodash/keyBy');
const uniqBy = require('lodash/uniqBy');
const QRCode = require('qrcode');
const Customer = require('../models/Customer');
const Event = require('../models/Event');
const Drive = require('../models/Google/Drive');
const Rum = require('../models/Rum');
const SectorHistory = require('../models/SectorHistory');
const EventRepository = require('../repositories/EventRepository');
const translate = require('./translate');
const { INTERVENTION } = require('./constants');
const GDriveStorageHelper = require('./gDriveStorage');
const SubscriptionsHelper = require('./subscriptions');
const FundingsHelper = require('./fundings');
const UtilsHelper = require('./utils');
const CustomerQRCode = require('../data/pdf/customerQRCode');
const { CompaniDate } = require('./dates/companiDates');

const { language } = translate;

exports.getCustomersBySector = async (query, credentials) => {
  const companyId = get(credentials, 'company._id');
  const sectorHistoryQuery = {
    sector: { $in: UtilsHelper.formatObjectIdsArray(query.sector) },
    startDate: { $lte: query.endDate },
    $or: [{ endDate: { $exists: false } }, { endDate: { $gte: query.startDate } }],
    company: companyId,
  };
  const sectorHistories = await SectorHistory.find(sectorHistoryQuery, { auxiliary: 1 }).lean();

  const eventQuery = {
    type: INTERVENTION,
    $or: [
      { auxiliary: { $in: UtilsHelper.formatObjectIdsArray(sectorHistories.map(sh => sh.auxiliary)) } },
      { sector: { $in: UtilsHelper.formatObjectIdsArray(query.sector) } },
    ],
    company: companyId,
    startDate: { $lte: query.endDate },
    endDate: { $gte: query.startDate },
  };
  const events = await Event
    .find(eventQuery, { customer: 1 })
    .populate({
      path: 'customer',
      select: 'subscriptions identity contact',
      populate: [
        { path: 'referentHistories', populate: { path: 'auxiliary' }, match: { company: companyId } },
        { path: 'subscriptions.service' },
      ],
    })
    .lean();

  return uniqBy(events.map(ev => ev.customer), '_id')
    .map(cus => SubscriptionsHelper.populateSubscriptionsServices(cus));
};

exports.getCustomersWithBilledEvents = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = { isBilled: true, type: INTERVENTION };

  return EventRepository.getCustomersWithBilledEvents(query, companyId);
};

exports.getCustomers = async (credentials, query = null) => {
  const today = CompaniDate().startOf('day').toDate();
  const findQuery = {
    company: get(credentials, 'company._id', null),
    ...(query && query.archived && { archivedAt: { $ne: null } }),
    ...(query && query.archived === false && { archivedAt: { $eq: null } }),
    ...(query && query.stopped && { $and: [{ stoppedAt: { $ne: null } }, { stoppedAt: { $lte: today } }] }),
    ...(query && query.stopped === false && { $or: [{ stoppedAt: { $eq: null } }, { stoppedAt: { $gt: today } }] }),
  };

  const customers = await Customer.find(findQuery).populate({ path: 'subscriptions.service' }).lean();

  if (customers.length === 0) return [];

  return customers.map(cus => SubscriptionsHelper.subscriptionsAccepted(
    SubscriptionsHelper.populateSubscriptionsServices(cus)
  ));
};

exports.getCustomersFirstIntervention = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const customers = await Customer.find({ ...query, company: companyId }, { _id: 1 })
    .populate({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } })
    .lean();

  return keyBy(customers, '_id');
};

exports.getCustomersWithIntervention = async credentials =>
  EventRepository.getCustomersWithIntervention(get(credentials, 'company._id', null));

exports.formatServiceInPopulate = (service) => {
  const lastVersion = UtilsHelper.getLastVersion(service.versions, 'startDate');

  return ({ ...service, versions: lastVersion, ...lastVersion });
};

exports.getCustomersWithSubscriptions = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  return Customer.find({ subscriptions: { $exists: true, $not: { $size: 0 } }, company: companyId })
    .populate({ path: 'subscriptions.service', transform: exports.formatServiceInPopulate })
    .populate({
      path: 'referentHistories',
      match: { company: companyId },
      populate: { path: 'auxiliary', select: 'identity' },
    })
    .select('subscriptions identity contact stoppedAt archivedAt referentHistories')
    .lean();
};

exports.getCustomer = async (customerId, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  let customer = await Customer.findOne({ _id: customerId })
    .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge versions.billingItems' } })
    .populate({ path: 'fundings.thirdPartyPayer' })
    .populate({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } })
    .populate({ path: 'referent', match: { company: companyId } })
    .lean({ autopopulate: true });
  if (!customer) return null;

  customer = SubscriptionsHelper.populateSubscriptionsServices(customer);
  customer = SubscriptionsHelper.subscriptionsAccepted(customer);

  if (customer.fundings && customer.fundings.length > 0) {
    customer = await FundingsHelper.populateFundingsList(customer);
  }

  return customer;
};

exports.getRumNumber = async companyId => Rum.findOneAndUpdate(
  { prefix: moment().format('YYMM'), company: companyId },
  {},
  { new: true, upsert: true, setDefaultsOnInsert: true }
).lean();

exports.formatRumNumber = (companyPrefixNumber, prefix, seq) => {
  const len = 20;
  const random = crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len).toUpperCase();

  return `R-${companyPrefixNumber}${prefix}${seq.toString().padStart(5, '0')}${random}`;
};

exports.formatPaymentPayload = async (customerId, payload, company) => {
  const customer = await Customer.findById(customerId).lean();

  // if the user updates its RIB, we should generate a new mandate.
  const customerIban = get(customer, 'payment.iban') || null;
  if (customerIban && customerIban !== payload.payment.iban) {
    const number = await exports.getRumNumber(company._id);
    const mandate = { rum: exports.formatRumNumber(company.prefixNumber, number.prefix, number.seq) };

    await Rum.updateOne({ prefix: number.prefix, company: company._id }, { $inc: { seq: 1 } });
    return {
      $set: flat(payload, { safe: true }),
      $push: { 'payment.mandates': mandate },
      $unset: { 'payment.bic': '' },
    };
  }

  return { $set: flat(payload, { safe: true }) };
};

exports.createCustomer = async (payload, credentials) => {
  const { company } = credentials;
  const companyId = company._id || null;
  const number = await exports.getRumNumber(company._id);
  const rum = exports.formatRumNumber(company.prefixNumber, number.prefix, number.seq);
  const folder = await GDriveStorageHelper.createFolder(payload.identity, company.customersFolderId);

  const customer = {
    ...payload,
    company: companyId,
    payment: { mandates: [{ rum }] },
    driveFolder: { driveId: folder.id, link: folder.webViewLink },
  };

  const newCustomer = await Customer.create(customer);
  number.seq += 1;
  await Rum.updateOne({ prefix: number.prefix, company: company._id }, { $set: { seq: number.seq } });

  return newCustomer;
};

const uploadQuote = async (customerId, quoteId, file) => {
  const payload = { 'quotes.$': { _id: quoteId, drive: { ...file } } };

  await Customer.updateOne(
    { _id: customerId, 'quotes._id': quoteId },
    { $set: flat(payload) },
    { new: true, autopopulate: false }
  );
};

const uploadMandate = async (customerId, mandateId, file) => {
  const payload = { 'payment.mandates.$': { _id: mandateId, drive: { ...file } } };

  await Customer.updateOne(
    { _id: customerId, 'payment.mandates._id': mandateId },
    { $set: flat(payload) },
    { new: true, autopopulate: false }
  );
};

const uploadFinancialCertificate = async (customerId, file) => Customer.updateOne(
  { _id: customerId },
  { $push: { financialCertificates: { ...file } } },
  { new: true, autopopulate: false }
);

exports.createAndSaveFile = async (params, payload) => {
  const uploadedFile = await GDriveStorageHelper.addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload.file.hapi.filename,
    type: payload['Content-Type'],
    body: payload.file,
  });

  let driveFileInfo = null;
  try {
    driveFileInfo = await Drive.getFileById({ fileId: uploadedFile.id });
  } catch (e) {
    throw Boom.notFound(translate[language].googleDriveFileNotFound);
  }

  let file;
  switch (payload.type) {
    case 'signedQuote':
      file = { driveId: uploadedFile.id, link: driveFileInfo.webViewLink };
      await uploadQuote(params._id, payload.quoteId, file);
      break;
    case 'signedMandate':
      file = { driveId: uploadedFile.id, link: driveFileInfo.webViewLink };
      await uploadMandate(params._id, payload.mandateId, file);
      break;
    case 'financialCertificates':
      file = { driveId: uploadedFile.id, link: driveFileInfo.webViewLink };
      await uploadFinancialCertificate(params._id, file);
      break;
  }

  return uploadedFile;
};

exports.deleteCertificates = (customerId, driveId) => Promise.all([
  Drive.deleteFile({ fileId: driveId }),
  Customer.updateOne({ _id: customerId }, { $pull: { financialCertificates: { driveId } } }),
]);

exports.generateQRCode = async (customerId) => {
  const qrCode = await QRCode.toDataURL(`${customerId}`, { margin: 0 });

  const customer = await Customer.findOne({ _id: customerId }, { identity: 1 }).lean();
  const customerName = UtilsHelper.formatIdentity(customer.identity, 'FL');

  const pdf = await CustomerQRCode.getPdf({ qrCode, customerName });

  return { fileName: 'qrcode.pdf', pdf };
};
