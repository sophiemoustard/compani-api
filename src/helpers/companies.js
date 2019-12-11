const cloneDeep = require('lodash/cloneDeep');
const Company = require('../models/Company');
const GdriveStorageHelper = require('./gdriveStorage');

exports.createCompany = async (companyPayload) => {
  const payload = cloneDeep(companyPayload);

  const companyFolder = await GdriveStorageHelper.createFolderForCompany(payload.name);
  const directDebitsFolder = await GdriveStorageHelper.createFolder('direct debits', companyFolder.id);

  return Company.create({ ...payload, directDebitsFolderId: directDebitsFolder.id, folderId: companyFolder.id });
};
