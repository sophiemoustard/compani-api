const flat = require('flat');
const Boom = require('boom');
const moment = require('moment');
const get = require('lodash/get');
const { addFile } = require('./gdriveStorage');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const EventRepository = require('../repositories/EventRepository');
const Drive = require('../models/Google/Drive');
const translate = require('../helpers/translate');
const { getLastVersion } = require('../helpers/utils');
const { INTERVENTION, CUSTOMER_CONTRACT } = require('./constants');
const EventsHelper = require('./events');
const SubscriptionsHelper = require('./subscriptions');
const FundingsHelper = require('./fundings');

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
  const uploadedFile = await addFile({
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

const getServicesNameList = (subscriptions) => {
  let list = `${getLastVersion(subscriptions[0].service.versions, 'startDate').name}`;
  if (subscriptions.length > 1) {
    for (const sub of subscriptions.slice(1)) {
      list = list.concat(`\r\n ${getLastVersion(sub.service.versions, 'startDate').name}`);
    }
  }
  return list;
};

const customerExportHeader = [
  'Email',
  'Titre',
  'Nom',
  'Prenom',
  'Date de naissance',
  'Adresse',
  'Environnement',
  'Objectifs',
  'Autres',
  'Référente',
  'Nom associé au compte bancaire',
  'IBAN',
  'BIC',
  'RUM',
  'Date de signature du mandat',
  'Nombre de souscriptions',
  'Souscriptions',
  'Nombre de financements',
  'Date de création',
];

exports.exportCustomers = async () => {
  const customers = await Customer.find().populate('subscriptions.service');
  const data = [customerExportHeader];

  for (const cus of customers) {
    const customerData = [cus.email || ''];
    if (cus.identity && Object.keys(cus.identity).length > 0) {
      customerData.push(
        get(cus, 'identity.title', ''),
        get(cus, 'identity.lastname', '').toUpperCase(),
        get(cus, 'identity.firstname', ''),
        cus.identity.birthDate ? moment(cus.identity.birthDate).format('DD/MM/YYYY') : ''
      );
    } else customerData.push('', '', '', '');

    if (cus.contact && cus.contact.address && cus.contact.address.fullAddress) customerData.push(cus.contact.address.fullAddress);
    else customerData.push('');

    if (cus.followUp && Object.keys(cus.followUp).length > 0) {
      customerData.push(
        get(cus, 'followUp.customerEnvironment', ''),
        get(cus, 'followUp.objectives', ''),
        get(cus, 'followUp.misc', ''),
        get(cus, 'followUp.referent', '')
      );
    } else customerData.push('', '', '', '');

    if (cus.payment && Object.keys(cus.payment).length > 0) {
      customerData.push(
        get(cus, 'payment.bankAccountOwner', ''),
        get(cus, 'payment.iban', ''),
        get(cus, 'payment.bic', '')
      );
      if (cus.payment.mandates && cus.payment.mandates.length > 0) {
        const lastMandate = getLastVersion(cus.payment.mandates, 'createdAt');
        customerData.push(
          lastMandate.rum || '',
          lastMandate.signedAt ? moment(lastMandate.signedAt).format('DD/MM/YYYY') : ''
        );
      } else customerData.push('', '');
    } else customerData.push('', '', '', '', '');

    if (cus.subscriptions && cus.subscriptions.length > 0) {
      customerData.push(cus.subscriptions.length, getServicesNameList(cus.subscriptions));
    } else customerData.push(0, '');

    if (cus.fundings && cus.fundings.length > 0) {
      customerData.push(cus.fundings.length);
    } else customerData.push(0);

    customerData.push(cus.createdAt ? moment(cus.createdAt).format('DD/MM/YYYY') : '');

    data.push(customerData);
  }

  return data;
};
