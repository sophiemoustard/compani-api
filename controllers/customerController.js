const Boom = require('boom');
const flat = require('flat');
const _ = require('lodash');
const moment = require('moment');
const path = require('path');
const os = require('os');

const translate = require('../helpers/translate');
const Customer = require('../models/Customer');
const Company = require('../models/Company');
const QuoteNumber = require('../models/QuoteNumber');
const ESign = require('../models/ESign');
const Drive = require('../models/GoogleDrive');
const { populateServices } = require('../helpers/populateServices');
const { generateRum } = require('../helpers/generateRum');
const { createFolder, handleFile } = require('../helpers/gdriveStorage');
const { createAndReadFile } = require('../helpers/createAndReadFile');
const { fileToBase64 } = require('../helpers/fileToBase64');
const { generateDocx } = require('../helpers/generateDocx');
const { generateSignatureRequest } = require('../helpers/generateSignatureRequest');
const { subscriptionsAccepted } = require('../helpers/customerConditionAgreement');

const { language } = translate;

const list = async (req) => {
  try {
    const { lastname, firstname, ...payload } = req.query;
    if (lastname) {
      payload['identity.lastname'] = { $regex: lastname, $options: 'i' };
    }
    if (firstname) {
      payload['identity.firstname'] = { $regex: firstname, $options: 'i' };
    }
    const customersRaw = await Customer.find(payload).lean();
    const customersPromises = customersRaw.map(subscriptionsAccepted);
    const [...customers] = await Promise.all(customersPromises);
    return {
      message: translate[language].customersShowAllFound,
      data: { customers }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const show = async (req) => {
  try {
    let customer = await Customer.findOne({ _id: req.params._id });
    if (!customer) {
      return Boom.notFound(translate[language].customerNotFound);
    }

    customer = customer.toObject();
    customer = await subscriptionsAccepted(customer);

    return {
      message: translate[language].customerFound,
      data: { customer: { ...customer, subscriptions: customer.subscriptions } },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
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
      data: {
        customer: newCustomer
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const customerDeleted = await Customer.findByIdAndRemove(req.params._id);
    if (!customerDeleted) {
      return Boom.notFound(translate[language].customerNotFound);
    }
    return {
      message: translate[language].customerRemoved,
      data: {
        customer: customerDeleted
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {
  try {
    let customerUpdated;
    if (req.payload.payment && req.payload.payment.iban) {
      const customer = await Customer.findById(req.params._id);
      // if the user updates its RIB, we should generate a new mandate.
      if (customer.payment.iban !== '' && customer.payment.iban !== req.payload.payment.iban) {
        const mandate = { rum: await generateRum() };
        customerUpdated = await Customer.findOneAndUpdate(
          { _id: req.params._id },
          { $set: flat(req.payload), $push: { 'payment.mandates': mandate } },
          { new: true }
        );
      } else {
        customerUpdated = await Customer.findOneAndUpdate({ _id: req.params._id }, { $set: flat(req.payload) }, { new: true });
      }
    } else {
      customerUpdated = await Customer.findOneAndUpdate({ _id: req.params._id }, { $set: flat(req.payload) }, { new: true });
    }

    if (!customerUpdated) {
      return Boom.notFound(translate[language].customerNotFound);
    }
    return {
      message: translate[language].customerUpdated,
      data: {
        customer: customerUpdated
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getSubscriptions = async (req) => {
  try {
    const customer = await Customer.findOne(
      {
        _id: req.params._id,
        subscriptions: { $exists: true },
      },
      { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
      { autopopulate: false }
    ).lean();

    if (!customer) {
      return Boom.notFound(translate[language].customerSubscriptionsNotFound);
    }

    const subscriptions = await populateServices(customer.subscriptions);

    return {
      message: translate[language].customerSubscriptionsFound,
      data: {
        customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
        subscriptions,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateSubscription = async (req) => {
  try {
    let payload;
    if (req.payload.service && req.payload.service._id) {
      payload = { 'subscriptions.$': { ...req.payload, service: req.payload.service._id } };
    } else {
      payload = { 'subscriptions.$': { ...req.payload } };
    }
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params._id, 'subscriptions._id': req.params.subscriptionId },
      { $set: flat(payload) },
      {
        new: true,
        select: { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
        autopopulate: false,
      },
    ).lean();

    if (!customer) {
      return Boom.notFound(translate[language].customerSubscriptionsNotFound);
    }

    const subscriptions = await populateServices(customer.subscriptions);

    return {
      message: translate[language].customerSubscriptionUpdated,
      data: {
        customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
        subscriptions,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const addSubscription = async (req) => {
  try {
    const serviceId = req.payload.service;
    const companyService = await Company.findOne({ 'customersConfig.services._id': serviceId });

    if (!companyService) {
      return Boom.notFound(translate[language].companyServiceNotFound);
    }

    const subscribedService = companyService.customersConfig.services.find(service => service._id == serviceId);

    if (!subscribedService) {
      return Boom.notFound(translate[language].companyServiceNotFound);
    }

    const customer = await Customer.findById(req.params._id);
    if (customer.subscriptions && customer.subscriptions.length > 0) {
      const isServiceAlreadySubscribed = customer.subscriptions.find(subscription => subscription.service.toHexString() === serviceId);
      if (isServiceAlreadySubscribed) {
        return Boom.conflict(translate[language].serviceAlreadySubscribed);
      }
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { subscriptions: req.payload } },
      {
        new: true,
        select: { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
        autopopulate: false,
      },
    ).lean();

    const subscriptions = await populateServices(updatedCustomer.subscriptions);

    return {
      message: translate[language].customerSubscriptionAdded,
      data: {
        customer: _.pick(updatedCustomer, ['_id', 'identity.lastname', 'identity.firstname']),
        subscriptions,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeSubscription = async (req) => {
  try {
    await Customer.findByIdAndUpdate(
      { _id: req.params._id },
      { $pull: { subscriptions: { _id: req.params.subscriptionId } } },
      {
        select: { 'identity.firstname': 1, 'identity.lastname': 1, subscriptions: 1 },
        autopopulate: false,
      }
    );

    return {
      message: translate[language].customerSubscriptionRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
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
      { autopopulate: false },
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
    return Boom.badImplementation();
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
      },
    ).lean();

    if (!customer) {
      return Boom.notFound(translate[language].customerMandateNotFound);
    }

    return {
      message: translate[language].customerMandateUpdated,
      data: {
        customer: _.pick(customer, ['_id', 'identity.lastname', 'identity.firstname']),
        mandates: customer.payment.mandates,
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const generateMandateSignatureRequest = async (req) => {
  try {
    const customer = await Customer.findById(req.params._id);
    if (!customer) return Boom.notFound();
    const mandateIndex = customer.payment.mandates.findIndex(mandate => mandate._id.toHexString() === req.params.mandateId);
    if (mandateIndex === -1) return Boom.notFound(translate[language].customerMandateNotFound);
    const docxPayload = {
      file: { fileId: req.payload.fileId },
      data: req.payload.fields
    };
    const filePath = await generateDocx(docxPayload);
    const file64 = await fileToBase64(filePath);
    const doc = await generateSignatureRequest({
      type: 'mandate',
      title: `MANDAT SEPA ${customer.payment.mandates[mandateIndex].rum}`,
      file: file64,
      signer: {
        name: req.payload.customer.name,
        email: req.payload.customer.email
      }
    });
    if (doc.data.error) return Boom.notFound(translate[language].documentNotFound);
    customer.payment.mandates[mandateIndex].everSignId = doc.data.document_hash;
    await customer.save();
    return {
      message: translate[language].signatureRequestCreated,
      data: { signatureRequest: { embeddedUrl: doc.data.signers[0].embedded_signing_url } }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getCustomerQuotes = async (req) => {
  try {
    const quotes = await Customer.findOne({
      _id: req.params._id,
      quotes: { $exists: true }
    }, {
      'identity.firstname': 1,
      'identity.lastname': 1,
      quotes: 1
    }, { autopopulate: false }).lean();
    if (!quotes) return Boom.notFound();
    return {
      message: translate[language].customerQuotesFound,
      data: {
        user: _.pick(quotes, ['_id', 'identity']),
        quotes: quotes.quotes
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
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
        quotes: 1
      },
      autopopulate: false
    });
    return {
      message: translate[language].customerQuoteAdded,
      data: {
        user: _.pick(newQuote, ['_id', 'identity']),
        quote: newQuote.quotes.find(quote => quoteNumber === quote.quoteNumber)
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeCustomerQuote = async (req) => {
  try {
    const customer = await Customer.findOneAndUpdate({ _id: req.params._id, 'quotes._id': req.params.quoteId }, { $pull: { quotes: { _id: req.params.quoteId } } }, {
      select: {
        firstname: 1,
        lastname: 1,
        quotes: 1
      },
      autopopulate: false
    });

    if (!customer) {
      return Boom.notFound(translate[language].customerNotFound);
    }

    return {
      message: translate[language].customerQuoteRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const createDriveFolder = async (req) => {
  try {
    const customer = await Customer.findOne(
      { _id: req.params._id },
      { 'identity.firstname': 1, 'identity.lastname': 1 },
    );

    if (customer.identity.firstname && customer.identity.lastname) {
      const parentFolderId = req.payload.parentFolderId || process.env.GOOGLE_DRIVE_CUSTOMERS_FOLDER_ID;
      const { folder, folderLink } = await createFolder(customer.identity, parentFolderId);
      customer.driveFolder = { id: folder.id, link: folderLink.webViewLink };
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

    return Boom.badImplementation();
  }
};

const uploadFile = async (req) => {
  try {
    const allowedFields = ['signedMandate', 'signedQuote'];
    const docKeys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    if (docKeys.length === 0) {
      Boom.forbidden('Upload not allowed');
    }

    const uploadedFile = await handleFile({
      driveFolderId: req.params.driveId,
      name: req.payload.fileName || req.payload[docKeys[0]].hapi.filename,
      type: req.payload['Content-Type'],
      body: req.payload[docKeys[0]]
    });

    let driveFileInfo = null;
    try {
      driveFileInfo = await Drive.getFileById({ fileId: uploadedFile.id });
    } catch (e) {
      req.log(['error', 'gdrive'], e);
      return Boom.notFound(translate[language].googleDriveFileNotFound);
    }

    let payload;
    let params = { _id: req.params._id };
    if (docKeys[0] === 'signedQuote') {
      payload = {
        'quotes.$': { _id: req.payload.quoteId, drive: { id: uploadedFile.id, link: driveFileInfo.webViewLink } },
      };
      params = { ...params, 'quotes._id': req.payload.quoteId };
    } else {
      payload = {
        'payment.mandates.$': { _id: req.payload.mandateId, drive: { id: uploadedFile.id, link: driveFileInfo.webViewLink } },
      };
      params = { ...params, 'payment.mandates._id': req.payload.mandateId };
    }

    await Customer.findOneAndUpdate(
      { ...params },
      { $set: flat(payload) },
      { new: true, autopopulate: false },
    );

    return {
      message: translate[language].fileCreated,
      data: { uploadedFile },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
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
    const uploadedFile = await handleFile({
      driveFolderId: customer.driveFolder.id,
      name: customer.payment.mandates[mandateIndex].rum,
      type: 'application/pdf',
      body: file
    });
    const driveFileInfo = await Drive.getFileById({ fileId: uploadedFile.id });
    customer.payment.mandates[mandateIndex].drive = {
      id: uploadedFile.id,
      link: driveFileInfo.webViewLink
    };

    await customer.save();

    return {
      message: translate[language].signedDocumentSaved,
      data: {
        user: _.pick(customer, ['_id', 'identity']),
        quote: customer.quotes.find(quote => req.payload.quoteId === quote._id.toHexString())
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const createHistorySubscription = async (req) => {
  try {
    const customer = await Customer.findOneAndUpdate({ _id: req.params._id }, { $push: { subscriptionsHistory: req.payload } }, {
      new: true,
      select: {
        'identity.firstname': 1,
        'identity.lastname': 1,
        subscriptionsHistory: 1
      },
      autopopulate: false
    });
    return {
      message: translate[language].customerSubscriptionHistoryAdded,
      data: {
        user: _.pick(customer, ['_id', 'identity']),
        subscriptionHistory: customer.subscriptionsHistory.find(sub => moment(sub.approvalDate).isSame(moment(), 'day'))
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};


module.exports = {
  list,
  show,
  create,
  remove,
  update,
  getSubscriptions,
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
  generateMandateSignatureRequest,
  saveSignedMandate,
  createHistorySubscription
};
