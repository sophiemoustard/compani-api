const Boom = require('boom');

const PayDocument = require('../models/PayDocument');
const { createAndSave, removeFromDriveAndDb } = require('../helpers/payDocuments');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const payDocument = await createAndSave(req.payload);

    return {
      message: translate[language].payDocumentCreated,
      data: { payDocument },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const payDocuments = await PayDocument.find(req.query);
    if (payDocuments.length === 0) {
      return {
        message: translate[language].payDocumentsNotFound,
        data: { payDocuments: [] },
      };
    }

    return {
      message: translate[language].payDocumentsFound,
      data: { payDocuments },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await removeFromDriveAndDb(req.params._id);

    return { message: translate[language].payDocumentDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list, remove };
