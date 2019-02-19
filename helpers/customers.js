const flat = require('flat');
const Boom = require('boom');

const { addFile } = require('./gdriveStorage');
const Customer = require('../models/Customer');
const Drive = require('../models/Google/Drive');
const translate = require('../helpers/translate');

const { language } = translate;

const uploadQuote = async (customerId, quoteId, file) => {
  const payload = {
    'quotes.$': { _id: quoteId, drive: { ...file } },
  };
  const params = { _id: customerId, 'quotes._id': quoteId };

  await Customer.findOneAndUpdate(
    { ...params },
    { $set: flat(payload) },
    { new: true, autopopulate: false },
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
    { new: true, autopopulate: false },
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
    { new: true, autopopulate: false },
  );
};

const createAndSaveFile = async (docKeys, params, payload) => {
  const uploadedFile = await addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload[docKeys[0]].hapi.filename,
    type: payload['Content-Type'],
    body: payload[docKeys[0]]
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
      file = { id: uploadedFile.id, link: driveFileInfo.webViewLink };
      await uploadQuote(params._id, payload.quoteId, file);
      break;
    case 'signedMandate':
      file = { id: uploadedFile.id, link: driveFileInfo.webViewLink };
      await uploadMandate(params._id, payload.mandateId, file);
      break;
    case 'financialCertificates':
      file = { driveId: uploadedFile.id, link: driveFileInfo.webViewLink };
      await uploadFinancialCertificate(params._id, file);
      break;
  }

  return uploadedFile;
};

module.exports = {
  createAndSaveFile,
};
