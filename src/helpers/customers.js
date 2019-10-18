const flat = require('flat');
const Boom = require('boom');
const crypto = require('crypto');
const moment = require('moment');
const has = require('lodash/has');
const GdriveStorageHelper = require('./gdriveStorage');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Event = require('../models/Event');
const EventRepository = require('../repositories/EventRepository');
const Drive = require('../models/Google/Drive');
const translate = require('../helpers/translate');
const { INTERVENTION, CUSTOMER_CONTRACT } = require('./constants');
const EventsHelper = require('./events');
const SubscriptionsHelper = require('./subscriptions');
const FundingsHelper = require('./fundings');
const Counter = require('../models/Rum');

const { language } = translate;

exports.getCustomerBySector = async (startDate, endDate, sector) => {
  const query = EventsHelper.getListQuery({ startDate, endDate, type: INTERVENTION, sector });
  return EventRepository.getCustomersFromEvent(query);
};

exports.getCustomersWithBilledEvents = async () => {
  const query = { isBilled: true, type: INTERVENTION };
  return EventRepository.getCustomerWithBilledEvents(query);
};

exports.getCustomers = async (query) => {
  const customers = await Customer.find(query)
    .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
    .populate({ path: 'firstIntervention', select: 'startDate' })
    .lean(); // Do not need to add { virtuals: true } as firstIntervention is populated

  if (customers.length === 0) return [];

  for (let i = 0, l = customers.length; i < l; i++) {
    customers[i] = SubscriptionsHelper.populateSubscriptionsServices(customers[i]);
    customers[i] = SubscriptionsHelper.subscriptionsAccepted(customers[i]);
  }

  return customers;
};

exports.getCustomersWithSubscriptions = async (query) => {
  const customers = await Customer.find(query)
    .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
    .lean();

  if (customers.length === 0) return [];

  for (let i = 0, l = customers.length; i < l; i++) {
    customers[i] = SubscriptionsHelper.populateSubscriptionsServices(customers[i]);
  }

  return customers;
};

exports.getCustomersWithCustomerContractSubscriptions = async () => {
  const customerContractServices = await Service.find({ type: CUSTOMER_CONTRACT }).lean();
  if (customerContractServices.length === 0) return [];

  const ids = customerContractServices.map(service => service._id);
  const customers = await Customer
    .find({ 'subscriptions.service': { $in: ids } })
    .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
    .lean();
  if (customers.length === 0) return [];

  for (let i = 0, l = customers.length; i < l; i++) {
    customers[i] = SubscriptionsHelper.populateSubscriptionsServices(customers[i]);
    customers[i] = SubscriptionsHelper.subscriptionsAccepted(customers[i]);
  }

  return customers;
};

exports.getCustomer = async (customerId) => {
  let customer = await Customer.findOne({ _id: customerId })
    .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
    .populate('fundings.thirdPartyPayer')
    .populate({ path: 'firstIntervention', select: 'startDate' })
    .populate({ path: 'referent', select: '_id identity.firstname identity.lastname picture' })
    .lean(); // Do not need to add { virtuals: true } as firstIntervention is populated
  if (!customer) return null;

  customer = SubscriptionsHelper.populateSubscriptionsServices(customer);
  customer = SubscriptionsHelper.subscriptionsAccepted(customer);

  const fundingsVersions = [];
  if (customer.fundings && customer.fundings.length > 0) {
    for (const funding of customer.fundings) {
      fundingsVersions.push(FundingsHelper.populateFundings(funding, customer));
    }
    customer.fundings = fundingsVersions;
  }

  return customer;
};

exports.generateRum = async () => {
  const query = {
    prefix: `R${moment().format('YYMM')}`,
  };
  const payload = { seq: 1 };
  const number = await Counter.findOneAndUpdate(
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
    if (customer.payment.iban && customer.payment.iban !== '' && customer.payment.iban !== customerPayload.payment.iban) {
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
    await Event.updateMany(
      { 'address.fullAddress': customer.contact[addressField].fullAddress, startDate: { $gte: moment().startOf('day') } },
      { $set: { address: customerPayload.contact[addressField] } },
      { new: true }
    );
    payload = { $set: flat(customerPayload, { safe: true }) };
  } else {
    payload = { $set: flat(customerPayload, { safe: true }) };
  }

  return Customer.findOneAndUpdate({ _id: customerId }, payload, { new: true }).lean();
};

const uploadQuote = async (customerId, quoteId, file) => {
  const payload = {
    'quotes.$': { _id: quoteId, drive: { ...file } },
  };
  const params = { _id: customerId, 'quotes._id': quoteId };

  await Customer.findOneAndUpdate(
    { ...params },
    { $set: flat(payload) },
    { new: true, autopopulate: false }
  );
};

const uploadMandate = async (customerId, mandateId, file) => {
  const payload = {
    'payment.mandates.$': { _id: mandateId, drive: { ...file } },
  };
  const params = { _id: customerId, 'payment.mandates._id': mandateId };

  await Customer.findOneAndUpdate(
    { ...params },
    { $set: flat(payload) },
    { new: true, autopopulate: false }
  );
};

const uploadFinancialCertificate = async (customerId, file) => {
  const payload = {
    financialCertificates: { ...file },
  };
  const params = { _id: customerId };

  await Customer.findOneAndUpdate(
    { ...params },
    { $push: payload },
    { new: true, autopopulate: false }
  );
};

exports.createAndSaveFile = async (docKeys, params, payload) => {
  const uploadedFile = await GdriveStorageHelper.addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload[docKeys[0]].hapi.filename,
    type: payload['Content-Type'],
    body: payload[docKeys[0]],
  });

  let driveFileInfo = null;
  try {
    driveFileInfo = await Drive.getFileById({ fileId: uploadedFile.id });
  } catch (e) {
    throw Boom.notFound(translate[language].googleDriveFileNotFound);
  }

  let file;
  switch (docKeys[0]) {
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
