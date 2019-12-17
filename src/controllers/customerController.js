const Boom = require('boom');
const flat = require('flat');
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
const { addFile } = require('../helpers/gdriveStorage');
const { createAndReadFile } = require('../helpers/file');
const CustomerHelper = require('../helpers/customers');
const FundingHelper = require('../helpers/fundings');
const MandatesHelper = require('../helpers/mandates');

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
    const customers = await CustomerHelper.getCustomersFirstIntervention(req.query, req.auth.credentials);

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
    const customers = await CustomerHelper.getCustomersWithBilledEvents(req.auth.credentials);

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
    const customer = await CustomerHelper.createCustomer(req.payload, req.auth.credentials);

    return {
      message: translate[language].customerCreated,
      data: { customer },
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

const deleteSubscription = async (req) => {
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
    const customer = await MandatesHelper.getMandates(req.params._id);

    if (!customer) return Boom.notFound(translate[language].customerNotFound);

    return {
      message: translate[language].customerMandatesFound,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateMandate = async (req) => {
  try {
    const customer = await MandatesHelper.updateMandate(req.params._id, req.params.mandateId, req.payload);

    return {
      message: translate[language].customerMandateUpdated,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getMandateSignatureRequest = async (req) => {
  try {
    const signatureRequest = await MandatesHelper.getSignatureRequest();

    return {
      message: translate[language].signatureRequestCreated,
      data: { signatureRequest },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getCustomerQuotes = async (req) => {
  try {
    const customer = await Customer.findOne(
      { _id: req.params._id, quotes: { $exists: true } },
      { identity: 1, quotes: 1 },
      { autopopulate: false }
    ).lean();
    if (!customer) return Boom.notFound();

    return {
      message: translate[language].customerQuotesFound,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createCustomerQuote = async (req) => {
  try {
    const payload = { quoteNumber: { seq: 1 } };
    const number = await QuoteNumber.findOneAndUpdate(
      { quoteNumber: { prefix: `DEV${moment().format('MMYY')}` } },
      { $inc: flat(payload) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const quoteNumber = `${number.quoteNumber.prefix}-${number.quoteNumber.seq.toString().padStart(3, '0')}`;
    req.payload.quoteNumber = quoteNumber;

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { quotes: req.payload } },
      { new: true, select: { identity: 1, quotes: 1 }, autopopulate: false }
    );

    return {
      message: translate[language].customerQuoteAdded,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
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
    await CustomerHelper.deleteCertificates(req.params._id, req.payload.driveId);

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
    const customer = await SubscriptionHelper.createSubscriptionHistory(req.params._id, req.payload);

    return {
      message: translate[language].customerSubscriptionHistoryAdded,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createFunding = async (req) => {
  try {
    const check = await FundingHelper.checkSubscriptionFunding(req.params._id, req.payload);
    if (!check) return Boom.conflict(translate[language].customerFundingConflict);
    let customer = await Customer.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { fundings: req.payload } },
      { new: true, select: { identity: 1, fundings: 1, subscriptions: 1 }, autopopulate: false }
    )
      .populate({ path: 'subscriptions.service' })
      .populate({ path: 'fundings.thirdPartyPayer' })
      .lean();

    customer = await FundingHelper.populateFundingsList(customer);

    return {
      message: translate[language].customerFundingCreated,
      data: { customer },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateFunding = async (req) => {
  try {
    if (req.payload.careDays) {
      const checkFundingPayload = {
        _id: req.params.fundingId,
        subscription: req.payload.subscription,
        versions: [req.payload],
      };
      const check = await FundingHelper.checkSubscriptionFunding(req.params._id, checkFundingPayload);
      if (!check) return Boom.conflict(translate[language].customerFundingConflict);
    }

    let customer = await Customer.findOneAndUpdate(
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
    customer = await FundingHelper.populateFundingsList(customer);

    return {
      message: translate[language].customerFundingUpdated,
      data: { customer },
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
  deleteSubscription,
  getMandates,
  updateMandate,
  getCustomerQuotes,
  createCustomerQuote,
  uploadFile,
  deleteCertificates,
  getMandateSignatureRequest,
  saveSignedMandate,
  createHistorySubscription,
  createFunding,
  updateFunding,
  removeFunding,
};
