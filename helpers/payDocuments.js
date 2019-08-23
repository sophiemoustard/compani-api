const Boom = require('boom');
const PayDocument = require('../models/PayDocument');
const GdriveStorage = require('./gdriveStorage');
const translate = require('./translate');

const { language } = translate;

const createAndSave = async (payDocumentPayload) => {
  const uploadedFile = await GdriveStorage.addFile({
    driveFolderId: payDocumentPayload.driveFolderId,
    name: payDocumentPayload.fileName || payDocumentPayload.payDoc.hapi.fileName,
    type: payDocumentPayload.mimeType,
    body: payDocumentPayload.payDoc,
  });
  if (!uploadedFile) throw Boom.failedDependency('Google drive: File not uploaded');

  const { id: driveId, webViewLink: link } = uploadedFile;
  const payDocument = new PayDocument({
    date: payDocumentPayload.date,
    nature: payDocumentPayload.nature,
    user: payDocumentPayload.user,
    file: { driveId, link },
  });

  return payDocument.save();
};

const removeFromDriveAndDb = async (payDocumentId) => {
  const deletedPayDocument = await PayDocument.findByIdAndRemove(payDocumentId);
  if (!deletedPayDocument) throw Boom.notFound(translate[language].payDocumentNotFound);

  return GdriveStorage.deleteFile(deletedPayDocument.file.driveId);
};

module.exports = { createAndSave, removeFromDriveAndDb };
