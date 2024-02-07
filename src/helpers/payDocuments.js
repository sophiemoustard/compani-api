const Boom = require('@hapi/boom');
const get = require('lodash/get');
const snakeCase = require('lodash/snakeCase');
const moment = require('../extensions/moment');
const PayDocument = require('../models/PayDocument');
const User = require('../models/User');
const GDriveStorageHelper = require('./gDriveStorage');
const UtilsHelper = require('./utils');
const { PAY_DOCUMENT_NATURES } = require('./constants');

exports.create = async (payload, credentials) => {
  const { mimeType, file, date, nature } = payload;
  const user = await User.findOne({ _id: payload.user }, { identity: 1, 'administrative.driveFolder': 1 }).lean();

  const identity = UtilsHelper.formatIdentity(user.identity, 'FL');
  const uploadedFile = await GDriveStorageHelper.addFile({
    driveFolderId: get(user, 'administrative.driveFolder.driveId'),
    name: snakeCase(`${PAY_DOCUMENT_NATURES[nature]} ${moment(date).format('DD-MM-YYYY-HHmm')} ${identity}`),
    type: mimeType,
    body: file,
  });
  if (!uploadedFile) throw Boom.failedDependency('Google drive: File not uploaded');

  const { id: driveId, webViewLink: link } = uploadedFile;

  return PayDocument.create({
    company: get(credentials, 'company._id', null),
    date,
    nature,
    user: payload.user,
    file: { driveId, link },
  });
};

exports.removeFromDriveAndDb = async (payDocumentId) => {
  const deletedPayDocument = await PayDocument.findByIdAndDelete(payDocumentId);
  return GDriveStorageHelper.deleteFile(deletedPayDocument.file.driveId);
};
