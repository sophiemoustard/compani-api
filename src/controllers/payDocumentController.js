const Boom = require('@hapi/boom');
const get = require('lodash/get');

const PayDocument = require('../models/PayDocument');
const PayDocumentHelper = require('../helpers/payDocuments');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const payDocument = await PayDocumentHelper.create(req.payload, req.auth.credentials);

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
    const payDocuments = await PayDocument.find({ ...req.query, company: get(req, 'auth.credentials.company._id') });

    return {
      message: !payDocuments.length ? translate[language].payDocumentsNotFound : translate[language].payDocumentsFound,
      data: { payDocuments },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await PayDocumentHelper.removeFromDriveAndDb(req.params._id);

    return { message: translate[language].payDocumentDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list, remove };
