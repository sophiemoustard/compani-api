const Boom = require('boom');
const get = require('lodash/get');
const AdministrativeDocument = require('../models/AdministrativeDocument');
const Company = require('../models/Company');
const GdriveStorage = require('./gdriveStorage');

exports.createAdministrativeDocument = async (payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const company = await Company.findById(companyId).lean();

  const uploadedFile = await GdriveStorage.addFile({
    driveFolderId: company.folderId,
    name: payload.name,
    type: payload.mimeType,
    body: payload.file,
  });
  if (!uploadedFile) throw Boom.failedDependency('Google drive: File not uploaded');

  const { id: driveId, webViewLink: link } = uploadedFile;
  const administrativeDocument = await AdministrativeDocument.create({
    company: companyId,
    name: payload.name,
    file: { driveId, link },
  });

  return administrativeDocument.toObject();
};

exports.listAdministrativeDocuments = async credentials =>
  AdministrativeDocument.find({ company: get(credentials, 'company._id', null) }).lean();

exports.removeAdministrativeDocument = async (administrativeDocument) => {
  await AdministrativeDocument.deleteOne({ _id: administrativeDocument._id });
  return GdriveStorage.deleteFile(administrativeDocument.file.driveId);
};
