const Boom = require('boom');

const PayDocument = require('../models/PayDocument');
const GdriveStorage = require('../helpers/gdriveStorage');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const uploadedFile = await GdriveStorage.addFile({
      driveFolderId: req.payload.driveFolderId,
      name: req.payload.fileName || req.payload.payDoc.hapi.fileName,
      type: req.payload['Content-Type'],
      body: req.payload.payDoc,
    });
    if (!uploadedFile) throw new Error('Google drive: File not uploaded');

    const { date, nature, user } = req.payload;
    const { id: driveId, webViewLink: link } = uploadedFile;
    const payDocPayload = {
      date,
      nature,
      user,
      file: { driveId, link },
    };
    const payDoc = new PayDocument(payDocPayload);
    await payDoc.save();

    return {
      message: translate[language].payDocumentCreated,
      data: { payDocument: payDoc },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
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
    return Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    const deletedPayDocument = await PayDocument.findByIdAndRemove(req.params._id);
    if (!deletedPayDocument) return Boom.notFound(translate[language].payDocumentNotFound);

    await GdriveStorage.deleteFile(deletedPayDocument.file.driveId);

    return { message: translate[language].payDocumentDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = { create, list, remove };
