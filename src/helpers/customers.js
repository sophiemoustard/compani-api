const flat = require('flat');
const Boom = require('@hapi/boom');
const crypto = require('crypto');
const moment = require('moment');
const has = require('lodash/has');
const get = require('lodash/get');
const keyBy = require('lodash/keyBy');
const Customer = require('../models/Customer');
const Event = require('../models/Event');
const Drive = require('../models/Google/Drive');
const Helper = require('../models/Helper');
const EventHistory = require('../models/EventHistory');
const ReferentHistory = require('../models/ReferentHistory');
const Repetition = require('../models/Repetition');
const CustomerPartner = require('../models/CustomerPartner');
const Rum = require('../models/Rum');
const User = require('../models/User');
const EventRepository = require('../repositories/EventRepository');
const CustomerRepository = require('../repositories/CustomerRepository');
const translate = require('./translate');
const { INTERVENTION } = require('./constants');
const GDriveStorageHelper = require('./gDriveStorage');
const SubscriptionsHelper = require('./subscriptions');
const ReferentHistoriesHelper = require('./referentHistories');
const FundingsHelper = require('./fundings');
const EventsHelper = require('./events');

const { language } = translate;

exports.getCustomersBySector = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);

  return EventRepository.getCustomersFromEvent(query, companyId);
};

exports.getCustomersWithBilledEvents = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = { isBilled: true, type: INTERVENTION };

  return EventRepository.getCustomersWithBilledEvents(query, companyId);
};

exports.getCustomers = async (credentials) => {
  const customers = await Customer.find({ company: get(credentials, 'company._id', null) })
    .populate({ path: 'subscriptions.service' })
    .lean();
  if (customers.length === 0) return [];

  return customers.map(cus => SubscriptionsHelper.subscriptionsAccepted(
    SubscriptionsHelper.populateSubscriptionsServices(cus)
  ));
};

exports.getCustomersFirstIntervention = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const customers = await Customer.find({ ...query, company: companyId }, { _id: 1 })
    // need the match as it is a virtual populate
    .populate({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } })
    .lean();

  return keyBy(customers, '_id');
};

exports.getCustomersWithIntervention = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  return EventRepository.getCustomersWithIntervention(companyId);
};

exports.getCustomersWithSubscriptions = async (credentials) => {
  const query = { subscriptions: { $exists: true, $not: { $size: 0 } } };
  return CustomerRepository.getCustomersWithSubscriptions(query, get(credentials, 'company._id', null));
};

exports.getCustomer = async (customerId, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  let customer = await Customer.findOne({ _id: customerId })
    .populate({
      path: 'subscriptions.service',
      populate: { path: 'versions.surcharge' },
    })
    .populate({ path: 'fundings.thirdPartyPayer' })
    // need the match as it is a virtual populate
    .populate({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } })
    .populate({ path: 'referent', match: { company: companyId } })
    .lean({ autopopulate: true }); // Do not need to add { virtuals: true } as firstIntervention is populated
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

exports.updateCustomerEvents = async (customerId, payload) => {
  const addressField = payload.contact.primaryAddress ? 'primaryAddress' : 'secondaryAddress';
  const customer = await Customer.findById(customerId).lean();
  const customerHasAddress = customer.contact[addressField] && customer.contact[addressField].fullAddress;

  if (customerHasAddress) {
    const isSecondaryAddressDeleted = has(payload, 'contact.secondaryAddress') &&
      get(payload, 'contact.secondaryAddress.fullAddress') === '';

    const setAddressToEventPayload = isSecondaryAddressDeleted
      ? { $set: { address: customer.contact.primaryAddress } }
      : { $set: { address: payload.contact[addressField] } };

    await Event.updateMany(
      {
        customer: customerId,
        'address.fullAddress': customer.contact[addressField].fullAddress,
        startDate: { $gte: moment().startOf('day').toDate() },
      },
      setAddressToEventPayload
    );
  }
};

const formatPayload = async (customerId, customerPayload, company) => {
  if (has(customerPayload, 'payment.iban')) return exports.formatPaymentPayload(customerId, customerPayload, company);

  return { $set: flat(customerPayload, { safe: true }) };
};

const handleCustomerStop = async (customerId, stoppedAt, credentials) => {
  const { company } = credentials;
  const timeStampedEventsCount = await EventHistory.countDocuments({
    'event.customer': customerId,
    startDate: { $gte: stoppedAt },
    action: { $in: EventHistory.TIMESTAMPING_ACTIONS },
  });
  if (timeStampedEventsCount > 0) throw Boom.conflict();

  await EventsHelper.deleteCustomerEvents(customerId, stoppedAt, null, credentials);

  const remainingRepetitions = await Repetition.find({ customer: customerId, company: company._id }).lean();
  for (const repetition of remainingRepetitions) {
    await EventsHelper.createEventsOnCustomerStop(repetition, stoppedAt, company);

    await Repetition.deleteOne({ _id: repetition._id });
  }
};

exports.updateCustomer = async (customerId, customerPayload, credentials) => {
  const { company } = credentials;

  if (customerPayload.stoppedAt) await handleCustomerStop(customerId, customerPayload.stoppedAt, credentials);

  if (has(customerPayload, 'referent')) {
    await ReferentHistoriesHelper.updateCustomerReferent(customerId, customerPayload.referent, company);

    return Customer.findOne({ _id: customerId }).lean();
  }

  if (has(customerPayload, 'contact.primaryAddress') || has(customerPayload, 'contact.secondaryAddress')) {
    await exports.updateCustomerEvents(customerId, customerPayload);
  }

  const payload = await formatPayload(customerId, customerPayload, company);

  return Customer.findOneAndUpdate({ _id: customerId }, payload, { new: true }).lean();
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

exports.removeCustomer = async (customerId) => {
  const customer = await Customer.findOne({ _id: customerId }, { driveFolder: 1, company: 1 }).lean();
  const helpers = await Helper.find({ customer: customerId, company: customer.company }, { user: 1 }).lean();

  await Customer.deleteOne({ _id: customerId });

  const promises = [];
  promises.push(
    Helper.deleteMany({ customer: customerId }),
    ReferentHistory.deleteMany({ customer: customerId }),
    EventHistory.deleteMany({ 'event.customer': customerId }),
    Repetition.deleteMany({ customer: customerId }),
    CustomerPartner.deleteMany({ customer: customerId })
  );

  for (const helper of helpers) {
    if (helper.user) {
      promises.push(User.updateOne({ _id: helper.user }, { $unset: { 'role.client': '', company: '' } }));
    }
  }

  if (get(customer, 'driveFolder.driveId')) promises.push(Drive.deleteFile({ fileId: customer.driveFolder.driveId }));

  await Promise.all(promises);
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
