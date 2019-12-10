const cloneDeep = require('lodash/cloneDeep');
const Company = require('../models/Company');
const GdriveStorageHelper = require('./gdriveStorage');

exports.createCompany = async (companyPayload) => {
  const payload = cloneDeep(companyPayload);

  const companyFolder = await GdriveStorageHelper.createFolderForCompany(payload.name);
  payload.folderId = companyFolder.id;
  const directDebitsFolder = await GdriveStorageHelper.createFolder('direct debits', payload.folderId);
  payload.directDebitsFolderId = directDebitsFolder.id;

  return Company.create(payload);
};
