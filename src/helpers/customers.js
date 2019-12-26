const flat = require('flat');
const Boom = require('boom');
const crypto = require('crypto');
const moment = require('moment');
const has = require('lodash/has');
const get = require('lodash/get');
const keyBy = require('lodash/keyBy');
const GdriveStorageHelper = require('./gdriveStorage');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Event = require('../models/Event');
const Drive = require('../models/Google/Drive');
const EventRepository = require('../repositories/EventRepository');
const translate = require('../helpers/translate');
const { INTERVENTION, CUSTOMER_CONTRACT } = require('./constants');
const EventsHelper = require('./events');
const SubscriptionsHelper = require('./subscriptions');
const FundingsHelper = require('./fundings');
const UtilsHelper = require('./utils');
const CustomerRepository = require('../repositories/CustomerRepository');
const Rum = require('../models/Rum');

const { language } = translate;

exports.getCustomerBySector = async (query, credentials) => {
  const eventQuery = EventsHelper.getListQuery({
    startDate: query.startDate,
    endDate: query.endDate,
    type: INTERVENTION,
  }, credentials);
  const companyId = get(credentials, 'company._id', null);

  return EventRepository.getCustomersFromEvent(query.sector, eventQuery, companyId);
};

exports.getCustomersWithBilledEvents = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = { isBilled: true, type: INTERVENTION };

  return EventRepository.getCustomersWithBilledEvents(query, companyId);
};

exports.getCustomers = async (credentials) => {
  const customers = await CustomerRepository.getCustomersList(get(credentials, 'company._id', null));
  if (customers.length === 0) return [];

  for (let i = 0, l = customers.length; i < l; i++) {
    if (customers[i].identity) customers[i].identity.fullName = UtilsHelper.formatIdentity(customers[i].identity, 'FL');
    customers[i] = SubscriptionsHelper.subscriptionsAccepted(customers[i]);
  }

  return customers;
};

exports.getCustomersFirstIntervention = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const customers = await Customer.find({ ...query, company: companyId }, { _id: 1 })
    // need the match as it is a virtual populate
    .populate({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } })
    .lean();

  return keyBy(customers, '_id');
};

exports.getCustomersWithCustomerContractSubscriptions = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const customerContractServices = await Service.find({ type: CUSTOMER_CONTRACT, company: companyId }).lean();
  if (customerContractServices.length === 0) return [];

  const ids = customerContractServices.map(service => service._id);
  const query = { 'subscriptions.service': { $in: ids } };
  const customers = await CustomerRepository.getCustomersWithSubscriptions(query, companyId);
  if (customers.length === 0) return [];

  for (let i = 0, l = customers.length; i < l; i++) {
    customers[i] = SubscriptionsHelper.subscriptionsAccepted(customers[i]);
  }

  return customers;
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
    .populate({ path: 'referent', select: '_id identity.firstname identity.lastname picture' })
    .lean(); // Do not need to add { virtuals: true } as firstIntervention is populated
  if (!customer) return null;

  customer = SubscriptionsHelper.populateSubscriptionsServices(customer);
  customer = SubscriptionsHelper.subscriptionsAccepted(customer);

  if (customer.fundings && customer.fundings.length > 0) {
    customer = await FundingsHelper.populateFundingsList(customer);
  }

  return customer;
};

exports.generateRum = async () => {
  const query = {
    prefix: `R${moment().format('YYMM')}`,
  };
  const payload = { seq: 1 };
  const number = await Rum.findOneAndUpdate(
    query,
    { $inc: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const len = 20;
  const random = crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len).toUpperCase();

  return `${number.prefix}${number.seq.toString().padStart(5, '0')}${random}`;
};

exports.unassignReferentOnContractEnd = async contract => Customer.updateMany(
  { referent: contract.user },
  { $unset: { referent: '' } }
);

exports.updateCustomer = async (customerId, customerPayload) => {
  let payload;
  if (customerPayload.referent === '') {
    payload = { $unset: { referent: '' } };
  } else if (has(customerPayload, 'payment.iban')) {
    const customer = await Customer.findById(customerId).lean();
    // if the user updates its RIB, we should generate a new mandate.
    if (customer.payment.iban && customer.payment.iban !== '' &&
      customer.payment.iban !== customerPayload.payment.iban) {
      const mandate = { rum: await exports.generateRum() };
      payload = {
        $set: flat(customerPayload, { safe: true }),
        $push: { 'payment.mandates': mandate },
        $unset: { 'payment.bic': '' },
      };
    } else {
      payload = { $set: flat(customerPayload, { safe: true }) };
    }
  } else if (has(customerPayload, 'contact.primaryAddress') || has(customerPayload, 'contact.secondaryAddress')) {
    const addressField = customerPayload.contact.primaryAddress ? 'primaryAddress' : 'secondaryAddress';
    const customer = await Customer.findById(customerId).lean();
    const customerHasAddress = customer.contact[addressField] && customer.contact[addressField].fullAddress;
    const noSecondaryAddressInPayload = has(customerPayload, 'contact.secondaryAddress') &&
      get(customerPayload, 'contact.secondaryAddress.fullAddress') === '';
    if (customerHasAddress) {
      const setAddressToEventPayload = noSecondaryAddressInPayload ?
        { $set: { address: customer.contact.primaryAddress } } :
        { $set: { address: customerPayload.contact[addressField] } };
      await Event.updateMany(
        {
          'address.fullAddress': customer.contact[addressField].fullAddress,
          startDate: { $gte: moment().startOf('day').toDate() },
        },
        setAddressToEventPayload,
        { new: true }
      );
    }
    payload = { $set: flat(customerPayload, { safe: true }) };
  } else {
    payload = { $set: flat(customerPayload, { safe: true }) };
  }

  return Customer.findOneAndUpdate({ _id: customerId }, payload, { new: true }).lean();
};

exports.createCustomer = async (payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const rum = await exports.generateRum();
  const company = await Company.findOne({ _id: companyId }).lean();
  const folder = await GdriveStorageHelper.createFolder(payload.identity, company.customersFolderId);

  const customer = {
    ...payload,
    company: companyId,
    payment: { mandates: [{ rum }] },
    driveFolder: { driveId: folder.id, link: folder.webViewLink },
  };

  return Customer.create(customer);
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
  const uploadedFile = await GdriveStorageHelper.addFile({
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
