const Boom = require('boom');
const flat = require('flat');
const _ = require('lodash');
const moment = require('moment');
const path = require('path');
const os = require('os');
const translate = require('../helpers/translate');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const QuoteNumber = require('../models/QuoteNumber');
const ESign = require('../models/ESign');
const Drive = require('../models/Google/Drive');
const { populateSubscriptionsServices } = require('../helpers/subscriptions');
const { generateRum } = require('../helpers/generateRum');
const { createFolder, addFile } = require('../helpers/gdriveStorage');
const { createAndReadFile } = require('../helpers/file');
const { generateSignatureRequest } = require('../helpers/eSign');
const {
  createAndSaveFile,
  getCustomerBySector,
  getCustomersWithBilledEvents,
  getCustomersWithSubscriptions,
  getCustomers,
  getCustomersWithCustomerContractSubscriptions,
  getCustomer,
  updateCustomer,
} = require('../helpers/customers');
const { checkSubscriptionFunding, populateFundings } = require('../helpers/fundings');

const { language } = translate;

const list = async (req) => {
  try {
    const customers = await getCustomers(req.query);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithSubscriptions = async (req) => {
  try {
    const query = { ...req.query, subscriptions: { $exists: true, $ne: { $size: 0 } } };
    const customers = await getCustomersWithSubscriptions(query);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listBySector = async (req) => {
  try {
    const customers = await getCustomerBySector(req.query.startDate, req.query.endDate, req.query.sector);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const listWithBilledEvents = async (req) => {
  try {
    const customers = await getCustomersWithBilledEvents();

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const listWithCustomerContractSubscriptions = async (req) => {
  try {
    const customers = await getCustomersWithCustomerContractSubscriptions();

    return {
      message: translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const show = async (req) => {
  try {
    const customer = await getCustomer(req.params._id);
    if (!customer) return Boom.notFound(translate[language].customerNotFound);

    return {
      message: translate[language].customerFound,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const mandate = { rum: await generateRum() };
    const payload = {
      ...req.payload,
      payment: { mandates: [mandate] },
    };
    const newCustomer = new Customer(payload);
    await newCustomer.save();
    return {
      message: translate[language].customerCreated,
      data: { customer: newCustomer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    const { customer } = req.pre;

    await customer.remove();

    return { message: translate[language].customerRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const customerUpdated = await updateCustomer(req.params._id, req.payload);
    if (!customerUpdated) {
      return Boom.notFound(translate[language].customerNotFound);
    }
    return {
      message: translate[language].customerUpdated,
      data: {
        customer: customerUpdated,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const updateSubscription = async (req) => {
  try {
    const customer = await Customer
      .findOneAndUpdate(
        { _id: req.params._id, 'subscriptions._id': req.params.subscriptionId },
        { $push: { 'subscriptions.$.versions': req.payload } },
        {
          new: true,
          select: { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
          autopopulate: false,
        }
      )
      .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
      .lean();

    if (!customer) return Boom.notFound(translate[language].customerSubscriptionsNotFound);

    const { subscriptions } = populateSubscriptionsServices(customer);

    return {
      message: translate[language].customerSubscriptionUpdated,
      data: {
        customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
        subscriptions,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const addSubscription = async (req) => {
  try {
    const serviceId = req.payload.service;
    const subscribedService = await Service.findOne({ _id: serviceId });

    if (!subscribedService) return Boom.notFound(translate[language].serviceNotFound);

    const customer = await Customer.findById(req.params._id);
    if (customer.subscriptions && customer.subscriptions.length > 0) {
      const isServiceAlreadySubscribed = customer.subscriptions.find(subscription => subscription.service.toHexString() === serviceId);
      if (isServiceAlreadySubscribed) return Boom.conflict(translate[language].serviceAlreadySubscribed);
    }

    const updatedCustomer = await Customer
      .findOneAndUpdate(
        { _id: req.params._id },
        { $push: { subscriptions: req.payload } },
        {
          new: true,
          select: { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
          autopopulate: false,
        }
      )
      .populate({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
      .lean();

    const { subscriptions } = populateSubscriptionsServices(updatedCustomer);

    return {
      message: translate[language].customerSubscriptionAdded,
      data: {
        customer: _.pick(updatedCustomer, ['_id', 'identity.lastname', 'identity.firstname']),
        subscriptions,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const removeSubscription = async (req) => {
  try {
    await Customer.findByIdAndUpdate(
      { _id: req.params._id },
      { $pull: { subscriptions: { _id: req.params.subscriptionId } } },
      {
        select: {
          'identity.firstname': 1,
          'identity.lastname': 1,
          subscriptions: 1,
          customerId: 1,
        },
        autopopulate: false,
      }
    );

    return { message: translate[language].customerSubscriptionRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const getMandates = async (req) => {
  try {
    const customer = await Customer.findOne(
      {
        _id: req.params._id,
        subscriptions: { $exists: true },
      },
      { 'identity.firstname': 1, 'identity.lastname': 1, 'payment.mandates': 1 },
      { autopopulate: false }
    ).lean();

    if (!customer) {
      return Boom.notFound(translate[language].customerNotFound);
    }

    return {
      message: translate[language].customerMandatesFound,
      data: {
        customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
        mandates: customer.payment.mandates,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const updateMandate = async (req) => {
  try {
    const payload = { 'payment.mandates.$': { ...req.payload } };
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params._id, 'payment.mandates._id': req.params.mandateId },
      { $set: flat(payload) },
      {
        new: true,
        select: { 'identity.firstname': 1, 'identity.lastname': 1, 'payment.mandates': 1 },
        autopopulate: false,
      }
    ).lean();

    if (!customer) {
      return Boom.notFound(translate[language].customerMandateNotFound);
    }

    return {
      message: translate[language].customerMandateUpdated,
      data: {
        customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
        mandates: customer.payment.mandates,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const generateMandateSignatureRequest = async (req) => {
  try {
    const customer = await Customer.findById(req.params._id);
    if (!customer) return Boom.notFound();

    const mandateIndex = customer.payment.mandates.findIndex(mandate => mandate._id.toHexString() === req.params.mandateId);
    if (mandateIndex === -1) return Boom.notFound(translate[language].customerMandateNotFound);

    const doc = await generateSignatureRequest({
      templateId: req.payload.fileId,
      fields: req.payload.fields,
      title: `MANDAT SEPA ${customer.payment.mandates[mandateIndex].rum}`,
      signers: [{
        id: '1',
        name: req.payload.customer.name,
        email: req.payload.customer.email,
      }],
      redirect: req.payload.redirect,
      redirectDecline: req.payload.redirectDecline,
    });
    if (doc.data.error) return Boom.badRequest(`Eversign: ${doc.data.error.type}`);
    customer.payment.mandates[mandateIndex].everSignId = doc.data.document_hash;
    await customer.save();
    return {
      message: translate[language].signatureRequestCreated,
      data: { signatureRequest: { embeddedUrl: doc.data.signers[0].embedded_signing_url } },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const getCustomerQuotes = async (req) => {
  try {
    const quotes = await Customer.findOne(
      { _id: req.params._id, quotes: { $exists: true } },
      {
        'identity.firstname': 1,
        'identity.lastname': 1,
        quotes: 1,
      },
      { autopopulate: false }
    ).lean();
    if (!quotes) return Boom.notFound();
    return {
      message: translate[language].customerQuotesFound,
      data: {
        user: _.pick(quotes, ['_id', 'identity']),
        quotes: quotes.quotes,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const createCustomerQuote = async (req) => {
  try {
    const query = { quoteNumber: { prefix: `DEV${moment().format('MMYY')}` } };
    const payload = { quoteNumber: { seq: 1 } };
    const number = await QuoteNumber.findOneAndUpdate(flat(query), { $inc: flat(payload) }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const quoteNumber = `${number.quoteNumber.prefix}-${number.quoteNumber.seq.toString().padStart(3, '0')}`;
    req.payload.quoteNumber = quoteNumber;
    const newQuote = await Customer.findOneAndUpdate({ _id: req.params._id }, { $push: { quotes: req.payload } }, {
      new: true,
      select: {
        'identity.firstname': 1,
        'identity.lastname': 1,
        quotes: 1,
      },
      autopopulate: false,
    });
    return {
      message: translate[language].customerQuoteAdded,
      data: {
        user: _.pick(newQuote, ['_id', 'identity']),
        quote: newQuote.quotes.find(quote => quoteNumber === quote.quoteNumber),
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const removeCustomerQuote = async (req) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params._id, 'quotes._id': req.params.quoteId },
      { $pull: { quotes: { _id: req.params.quoteId } } },
      {
        select: { firstname: 1, lastname: 1, quotes: 1 },
        autopopulate: false,
      }
    );

    if (!customer) {
      return Boom.notFound(translate[language].customerNotFound);
    }

    return {
      message: translate[language].customerQuoteRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const createDriveFolder = async (req) => {
  try {
    const customer = await Customer.findOne(
      { _id: req.params._id },
      { 'identity.firstname': 1, 'identity.lastname': 1 }
    );

    if (customer.identity.lastname) {
      const parentFolderId = req.payload.parentFolderId || process.env.GOOGLE_DRIVE_CUSTOMERS_FOLDER_ID;
      const { folder, folderLink } = await createFolder(customer.identity, parentFolderId);
      customer.driveFolder = { driveId: folder.id, link: folderLink.webViewLink };
      await customer.save();
    }

    return {
      message: translate[language].customerUpdated,
      data: { updatedCustomer: customer },
    };
  } catch (e) {
    req.log('error', e);
    if (e.output && e.output.statusCode === 424) {
      return Boom.failedDependency(translate[language].googleDriveFolderCreationFailed);
    }

    if (e.output && e.output.statusCode === 404) {
      return Boom.notFound(translate[language].googleDriveFolderNotFound);
    }

    return Boom.badImplementation(e);
  }
};

const uploadFile = async (req) => {
  try {
    const allowedFields = ['financialCertificates'];

    if (req.auth.credentials.scope.includes('customers:administrative:edit')) {
      allowedFields.push('signedMandate', 'signedQuote');
    }

    const docKeys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    if (docKeys.length === 0) Boom.forbidden('Upload not allowed');

    const uploadedFile = await createAndSaveFile(docKeys, req.params, req.payload);

    return {
      message: translate[language].fileCreated,
      data: { uploadedFile },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const updateCertificates = async (req) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params._id },
      { $pull: req.payload },
      {
        select: { firstname: 1, lastname: 1, financialCertificates: 1 },
        autopopulate: false,
      }
    );

    if (!customer) {
      return Boom.notFound(translate[language].customerNotFound);
    }

    return {
      message: translate[language].customerFinancialCertificateRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const saveSignedMandate = async (req) => {
  try {
    const customer = await Customer.findById(req.params._id);
    if (!customer) {
      return Boom.notFound();
    }
    const mandateIndex = customer.payment.mandates.findIndex(doc => doc._id.toHexString() === req.params.mandateId);
    if (mandateIndex === -1) return Boom.notFound(translate[language].customerMandateNotFound);
    const everSignDoc = await ESign.getDocument(customer.payment.mandates[mandateIndex].everSignId);
    if (everSignDoc.data.error) return Boom.notFound(translate[language].documentNotFound);
    if (!everSignDoc.data.log.some(type => type.event === 'document_signed')) return Boom.serverUnavailable();
    const finalPDF = await ESign.downloadFinalDocument(customer.payment.mandates[mandateIndex].everSignId);
    const tmpPath = path.join(os.tmpdir(), `signedDoc-${moment().format('DDMMYYYY-HHmm')}.pdf`);
    const file = await createAndReadFile(finalPDF.data, tmpPath);
    const uploadedFile = await addFile({
      driveFolderId: customer.driveFolder.driveId,
      name: customer.payment.mandates[mandateIndex].rum,
      type: 'application/pdf',
      body: file,
    });
    const driveFileInfo = await Drive.getFileById({ fileId: uploadedFile.id });
    customer.payment.mandates[mandateIndex].drive = {
      driveId: uploadedFile.id,
      link: driveFileInfo.webViewLink,
    };
    customer.payment.mandates[mandateIndex].signedAt = moment.utc().toDate();

    await customer.save();

    return {
      message: translate[language].signedDocumentSaved,
      data: {
        user: _.pick(customer, ['_id', 'identity']),
        mandate: customer.payment.mandates.find(mandate => req.params.mandateId === mandate._id.toHexString()),
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const createHistorySubscription = async (req) => {
  try {
    const customer = await Customer.findOneAndUpdate({ _id: req.params._id }, { $push: { subscriptionsHistory: req.payload } }, {
      new: true,
      select: {
        'identity.firstname': 1,
        'identity.lastname': 1,
        subscriptionsHistory: 1,
      },
      autopopulate: false,
    });
    return {
      message: translate[language].customerSubscriptionHistoryAdded,
      data: {
        customer: _.pick(customer, ['_id', 'identity']),
        subscriptionHistory: customer.subscriptionsHistory.find(sub => moment(sub.approvalDate).isSame(moment(), 'day')),
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const createFunding = async (req) => {
  try {
    const check = await checkSubscriptionFunding(req.params._id, req.payload);
    if (!check) return Boom.conflict(translate[language].customerFundingConflict);
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { fundings: req.payload } },
      {
        new: true,
        select: { 'identity.firstname': 1, 'identity.lastname': 1, fundings: 1, subscriptions: 1 },
        autopopulate: false,
      }
    ).populate('subscriptions.service').populate('fundings.thirdPartyPayer').lean();

    if (!customer) return Boom.notFound(translate[language].customerNotFound);

    let funding = customer.fundings[customer.fundings.length - 1];
    funding = populateFundings(funding, customer);

    return {
      message: translate[language].customerFundingCreated,
      data: {
        customer: _.pick(customer, ['_id', 'identity']),
        funding,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateFunding = async (req) => {
  try {
    if (req.payload.careDays) {
      const checkFundingPayload = { _id: req.params.fundingId, subscription: req.payload.subscription, versions: [req.payload] };
      const check = await checkSubscriptionFunding(req.params._id, checkFundingPayload);
      if (!check) return Boom.conflict(translate[language].customerFundingConflict);
    }
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params._id, 'fundings._id': req.params.fundingId },
      { $push: { 'fundings.$.versions': req.payload } },
      {
        new: true,
        select: { 'identity.firstname': 1, 'identity.lastname': 1, fundings: 1, subscriptions: 1 },
        autopopulate: false,
      }
    ).populate('subscriptions.service').populate('fundings.thirdPartyPayer').lean();

    if (!customer) return Boom.notFound(translate[language].customerFundingNotFound);

    let funding = customer.fundings.find(fund => fund._id.toHexString() === req.params.fundingId);
    funding = populateFundings(funding, customer);

    return {
      message: translate[language].customerFundingUpdated,
      data: {
        customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
        funding,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const removeFunding = async (req) => {
  try {
    await Customer.findOneAndUpdate(
      { _id: req.params._id },
      { $pull: { fundings: { _id: req.params.fundingId } } },
      {
        select: { 'identity.firstname': 1, 'identity.lastname': 1, fundings: 1, subscriptions: 1 },
        autopopulate: false,
      }
    ).populate('subscriptions.service').populate('fundings.thirdPartyPayer');

    return {
      message: translate[language].customerFundingRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};


module.exports = {
  list,
  listWithSubscriptions,
  listBySector,
  listWithCustomerContractSubscriptions,
  listWithBilledEvents,
  show,
  create,
  remove,
  update,
  addSubscription,
  updateSubscription,
  removeSubscription,
  getMandates,
  updateMandate,
  createDriveFolder,
  getCustomerQuotes,
  createCustomerQuote,
  removeCustomerQuote,
  uploadFile,
  updateCertificates,
  generateMandateSignatureRequest,
  saveSignedMandate,
  createHistorySubscription,
  createFunding,
  updateFunding,
  removeFunding,
};
