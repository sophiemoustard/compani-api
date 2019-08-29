const flat = require('flat');
const Boom = require('boom');
const moment = require('moment');
const get = require('lodash/get');
const { addFile } = require('./gdriveStorage');
const Customer = require('../models/Customer');
const Event = require('../models/Event');
const Drive = require('../models/Google/Drive');
const translate = require('../helpers/translate');
const { getLastVersion } = require('../helpers/utils');
const { INTERVENTION } = require('./constants');
const SubscriptionsHelper = require('./subscriptions');
const EventsHelper = require('./events');

const { language } = translate;

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
  'Pathologie',
  'Commentaire',
  'Details intervention',
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
        get(cus, 'followUp.pathology', ''),
        get(cus, 'followUp.comments', ''),
        get(cus, 'followUp.details', ''),
        get(cus, 'followUp.misc', ''),
        get(cus, 'followUp.referent', '')
      );
    } else customerData.push('', '', '', '', '');

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

exports.getCustomerBySector = async (startDate, endDate, sector) => {
  const query = EventsHelper.getListQuery({ startDate, endDate, type: INTERVENTION, sector });
  const eventsBySector = await Event.find(query).lean();
  if (eventsBySector.length === 0) return [];

  const customerIds = [];
  eventsBySector.map((event) => {
    if (!customerIds.includes(event.customer.toHexString())) customerIds.push(event.customer.toHexString());
  });

  const customers = await Customer
    .find({ _id: customerIds })
    .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
    .lean();

  for (let i = 0, l = customers.length; i < l; i++) {
    customers[i] = await SubscriptionsHelper.populateSubscriptionsServices(customers[i]);
    customers[i] = SubscriptionsHelper.subscriptionsAccepted(customers[i]);
  }

  return customers;
};
