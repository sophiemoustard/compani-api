const Company = require('../models/Company');
const GdriveStorageHelper = require('./gdriveStorage');

exports.createCompany = async (companyPayload) => {
  const companyFolder = await GdriveStorageHelper.createFolderForCompany(companyPayload.name);
  const directDebitsFolder = await GdriveStorageHelper.createFolder('direct debits', companyFolder.id);

  return Company.create({ ...companyPayload, directDebitsFolderId: directDebitsFolder.id, folderId: companyFolder.id });
};
