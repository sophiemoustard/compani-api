const flat = require('flat');
const get = require('lodash/get');
const Company = require('../models/Company');
const CompanyHolding = require('../models/CompanyHolding');
const Event = require('../models/Event');
const GDriveStorageHelper = require('./gDriveStorage');
const drive = require('../models/Google/Drive');
const { INTERVENTION } = require('./constants');

exports.createCompany = async (companyPayload) => {
  const companyFolder = await GDriveStorageHelper.createFolderForCompany(companyPayload.name);
  const [directDebitsFolder, customersFolder, auxiliariesFolder] = await Promise.all([
    GDriveStorageHelper.createFolder('direct debits', companyFolder.id),
    GDriveStorageHelper.createFolder('customers', companyFolder.id),
    GDriveStorageHelper.createFolder('auxiliaries', companyFolder.id),
  ]);
  const lastCompany = await Company.find().sort({ prefixNumber: -1 }).limit(1).lean();

  return Company.create({
    ...companyPayload,
    prefixNumber: lastCompany[0].prefixNumber + 1,
    directDebitsFolderId: directDebitsFolder.id,
    folderId: companyFolder.id,
    customersFolderId: customersFolder.id,
    auxiliariesFolderId: auxiliariesFolder.id,
  });
};

exports.list = async (query) => {
  let linkedCompanyList = [];
  if (query.noHolding) {
    const companyHoldings = await CompanyHolding.find({}, { company: 1 }).lean();
    linkedCompanyList = (companyHoldings.map(ch => ch.company));
  }

  return Company.find({ _id: { $nin: linkedCompanyList.flat() } }, { name: 1 }).lean();
};

exports.uploadFile = async (payload, params) => {
  const { fileName, type, file } = payload;

  const uploadedFile = await GDriveStorageHelper.addFile({
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
  return Company.findOneAndUpdate({ _id: params._id }, { $set: flat(companyPayload) }, { new: true }).lean();
};

exports.getFirstIntervention = async credentials => Event
  .find({ company: get(credentials, 'company._id'), type: INTERVENTION })
  .sort({ startDate: 1 })
  .limit(1)
  .lean();

exports.updateCompany = async (companyId, payload) => {
  const transportSubs = get(payload, 'rhConfig.transportSubs');
  if (transportSubs && !Array.isArray(transportSubs)) {
    const { subId } = payload.rhConfig.transportSubs;
    const set = { 'rhConfig.transportSubs.$': transportSubs };

    return Company.findOneAndUpdate(
      { _id: companyId, 'rhConfig.transportSubs._id': subId },
      { $set: flat(set) },
      { new: true }
    );
  }

  return Company.findOneAndUpdate({ _id: companyId }, { $set: flat(payload) }, { new: true });
};

exports.getCompany = async companyId => Company
  .findOne({ _id: companyId })
  .populate({ path: 'billingRepresentative', select: '_id picture contact identity local' })
  .lean();
