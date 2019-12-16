const Boom = require('boom');
const flat = require('flat');
const get = require('lodash/get');
const pick = require('lodash/pick');
const moment = require('moment');
const path = require('path');
const os = require('os');
const translate = require('../helpers/translate');
const Customer = require('../models/Customer');
const QuoteNumber = require('../models/QuoteNumber');
const ESign = require('../models/ESign');
const Drive = require('../models/Google/Drive');
const SubscriptionHelper = require('../helpers/subscriptions');
const { generateRum } = require('../helpers/customers');
const { createFolder, addFile } = require('../helpers/gdriveStorage');
const { createAndReadFile } = require('../helpers/file');
const { generateSignatureRequest } = require('../helpers/eSign');
const CustomerHelper = require('../helpers/customers');
const { checkSubscriptionFunding, populateFundings } = require('../helpers/fundings');

const { language } = translate;

const list = async (req) => {
  try {
    const customers = await CustomerHelper.getCustomers(req.auth.credentials);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithFirstIntervention = async (req) => {
  try {
    const { query, auth } = req;
    const companyId = get(auth, 'credentials.company._id', null);
    const customers = await CustomerHelper.getCustomersFirstIntervention(query, companyId);

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
    const customers = await CustomerHelper.getCustomersWithSubscriptions(req.auth.credentials);

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
    const customers = await CustomerHelper.getCustomerBySector(req.query, req.auth.credentials);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithBilledEvents = async (req) => {
  try {
    const { credentials } = req.auth;
    const customers = await CustomerHelper.getCustomersWithBilledEvents(credentials);

    return {
      message: customers.length === 0 ? translate[language].customersNotFound : translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithCustomerContractSubscriptions = async (req) => {
  try {
    const customers = await CustomerHelper.getCustomersWithCustomerContractSubscriptions(req.auth.credentials);

    return {
      message: translate[language].customersFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithIntervention = async (req) => {
  try {
    const customers = await CustomerHelper.getCustomersWithIntervention(req.auth.credentials);
    return {
      message: customers.length > 0 ? translate[language].customersFound : translate[language].customersNotFound,
      data: { customers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const show = async (req) => {
  try {
    const customer = await CustomerHelper.getCustomer(req.params._id, req.auth.credentials);
    if (!customer) return Boom.notFound(translate[language].customerNotFound);

    return {
      message: translate[language].customerFound,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    if (!companyId) return Boom.forbidden();
    const mandate = { rum: await generateRum() };
    const payload = {
      ...req.payload,
      company: companyId,
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
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
    const customer = await CustomerHelper.updateCustomer(req.params._id, req.payload);
    if (!customer) Boom.notFound(translate[language].customerNotFound);

    return {
      message: translate[language].customerUpdated,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateSubscription = async (req) => {
  try {
    const customer = await SubscriptionHelper.updateSubscription(req.params, req.payload);

    return {
      message: translate[language].customerSubscriptionUpdated,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const addSubscription = async (req) => {
  try {
    const customer = await SubscriptionHelper.addSubscription(req.params._id, req.payload);

    return {
      message: translate[language].customerSubscriptionAdded,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const deleteSubsctiption = async (req) => {
  try {
    await SubscriptionHelper.deleteSubscription(req.params._id, req.params.subscriptionId);

    return { message: translate[language].customerSubscriptionRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
        customer: pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
        mandates: customer.payment.mandates,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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

    return {
      message: translate[language].customerMandateUpdated,
      data: {
        customer: pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
        mandates: customer.payment.mandates,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getCustomerQuotes = async (req) => {
  try {
    const quotes = await Customer.findOne(
      { _id: req.params._id, quotes: { $exists: true } },
      { 'identity.firstname': 1, 'identity.lastname': 1, quotes: 1 },
      { autopopulate: false }
    ).lean();
    if (!quotes) return Boom.notFound();
    return {
      message: translate[language].customerQuotesFound,
      data: {
        user: pick(quotes, ['_id', 'identity']),
        quotes: quotes.quotes,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
        user: pick(newQuote, ['_id', 'identity']),
        quote: newQuote.quotes.find(quote => quoteNumber === quote.quoteNumber),
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createDriveFolder = async (req) => {
  try {
    const customer = await Customer.findOne(
      { _id: req.params._id },
      { 'identity.firstname': 1, 'identity.lastname': 1, company: 1 }
    );
    if (customer.identity.lastname) {
      const parentFolderId = req.payload.parentFolderId || process.env.GOOGLE_DRIVE_CUSTOMERS_FOLDER_ID;
      const folder = await createFolder(customer.identity, parentFolderId);
      customer.driveFolder = { driveId: folder.id, link: folder.webViewLink };
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

    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const uploadFile = async (req) => {
  try {
    const uploadedFile = await CustomerHelper.createAndSaveFile(req.params, req.payload);

    return {
      message: translate[language].fileCreated,
      data: { uploadedFile },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const deleteCertificates = async (req) => {
  try {
    await CustomerHelper.deleteCertificates(req.payload.driveId);

    return { message: translate[language].customerFinancialCertificateRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
        user: pick(customer, ['_id', 'identity']),
        mandate: customer.payment.mandates.find(mandate => req.params.mandateId === mandate._id.toHexString()),
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
        customer: pick(customer, ['_id', 'identity']),
        subscriptionHistory: customer.subscriptionsHistory.find(sub => moment(sub.approvalDate).isSame(moment(), 'day')),
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
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
    )
      .populate({ path: 'subscriptions.service' })
      .populate({ path: 'fundings.thirdPartyPayer' })
      .lean();

    if (!customer) return Boom.notFound(translate[language].customerNotFound);

    let funding = customer.fundings[customer.fundings.length - 1];
    funding = populateFundings(funding, customer);

    return {
      message: translate[language].customerFundingCreated,
      data: {
        customer: pick(customer, ['_id', 'identity']),
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
    )
      .populate({ path: 'subscriptions.service' })
      .populate({ path: 'fundings.thirdPartyPayer' })
      .lean();

    if (!customer) return Boom.notFound(translate[language].customerFundingNotFound);

    let funding = customer.fundings.find(fund => fund._id.toHexString() === req.params.fundingId);
    funding = populateFundings(funding, customer);

    return {
      message: translate[language].customerFundingUpdated,
      data: {
        customer: pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
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
    )
      .populate({ path: 'subscriptions.service' })
      .populate({ path: 'fundings.thirdPartyPayer' })
      .lean();

    return {
      message: translate[language].customerFundingRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};


module.exports = {
  list,
  listWithFirstIntervention,
  listWithSubscriptions,
  listBySector,
  listWithCustomerContractSubscriptions,
  listWithBilledEvents,
  listWithIntervention,
  show,
  create,
  remove,
  update,
  addSubscription,
  updateSubscription,
  deleteSubsctiption,
  getMandates,
  updateMandate,
  createDriveFolder,
  getCustomerQuotes,
  createCustomerQuote,
  uploadFile,
  deleteCertificates,
  generateMandateSignatureRequest,
  saveSignedMandate,
  createHistorySubscription,
  createFunding,
  updateFunding,
  removeFunding,
};
