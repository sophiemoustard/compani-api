const Boom = require('@hapi/boom');
const get = require('lodash/get');
const AdministrativeDocument = require('../models/AdministrativeDocument');
const Company = require('../models/Company');
const Drive = require('../models/Google/Drive');
const GDriveStorageHelper = require('./gDriveStorage');

exports.createAdministrativeDocument = async (payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const company = await Company.findById(companyId).lean();

  const uploadedFile = await GDriveStorageHelper.addFile({
    driveFolderId: company.folderId,
    name: payload.name,
    type: payload.mimeType,
    body: payload.file,
  });

  if (!uploadedFile) throw Boom.failedDependency('Google drive: File not uploaded');

  const { id: driveId, webViewLink: link } = uploadedFile;

  await Drive.createPermission({
    fileId: driveId,
    permission: { type: 'anyone', role: 'reader', allowFileDiscovery: false },
  });

  const administrativeDocument = await AdministrativeDocument.create({
    company: companyId,
    name: payload.name,
    driveFile: { driveId, link },
  });

  return administrativeDocument.toObject();
};

exports.listAdministrativeDocuments = async credentials =>
  AdministrativeDocument.find({ company: get(credentials, 'company._id', null) }).lean();

exports.removeAdministrativeDocument = async (administrativeDocumentId) => {
  const administrativeDocument = await AdministrativeDocument
    .findOneAndDelete({ _id: administrativeDocumentId })
    .lean();
  if (administrativeDocument.driveFile) await GDriveStorageHelper.deleteFile(administrativeDocument.driveFile.driveId);
};
