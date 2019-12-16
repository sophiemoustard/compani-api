const flat = require('flat');
const Boom = require('boom');
const Company = require('../models/Company');
const GdriveStorageHelper = require('./gdriveStorage');
const { addFile } = require('../helpers/gdriveStorage');
const drive = require('../models/Google/Drive');

exports.createCompany = async (companyPayload) => {
  const companyFolder = await GdriveStorageHelper.createFolderForCompany(companyPayload.name);
  const directDebitsFolder = await GdriveStorageHelper.createFolder('direct debits', companyFolder.id);

  return Company.create({ ...companyPayload, directDebitsFolderId: directDebitsFolder.id, folderId: companyFolder.id });
};

exports.uploadFile = async (payload, params) => {
  const { fileName, type, file } = payload;

  const uploadedFile = await addFile({
    driveFolderId: params.driveId,
    name: fileName,
    type: payload['Content-Type'],
    body: file,
  });
  const driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });
  const configKey = (type.match(/contract/i)) ? 'rhConfig' : 'customersConfig';
  const companyPayload = {
    [configKey]: {
      templates: {
        [type]: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink },
      },
    },
  };
  return Company.findOneAndUpdate({ _id: params._id }, { $set: flat(companyPayload) }, { new: true });
};
