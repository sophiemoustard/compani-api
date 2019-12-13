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
  const allowedFields = [
    'contractWithCompany',
    'contractWithCompanyVersion',
    'contractWithCustomer',
    'contractWithCustomerVersion',
    'debitMandate',
    'quote',
  ];
  const keys = Object.keys(payload).filter(key => allowedFields.indexOf(key) !== -1);
  if (keys.length === 0) return Boom.forbidden('Upload not allowed');

  const uploadedFile = await addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload[keys[0]].hapi.filename,
    type: payload['Content-Type'],
    body: payload[keys[0]],
  });
  const driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });
  const configKey = (keys[0].match(/contract/i)) ? 'rhConfig' : 'customersConfig';
  const companyPayload = {
    [configKey]: {
      templates: {
        [keys[0]]: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink },
      },
    },
  };

  return Company.findOneAndUpdate({ _id: params._id }, { $set: flat(companyPayload) }, { new: true });
};
