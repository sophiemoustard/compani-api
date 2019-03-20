const flat = require('flat');
const mongoose = require('mongoose');
const moment = require('moment');

const Contract = require('../models/Contract');
const User = require('../models/User');
const drive = require('../models/Google/Drive');
const { addFile } = require('./gdriveStorage');
const { CUSTOMER_CONTRACT, COMPANY_CONTRACT } = require('./constants');

const endContract = async (contractId, payload) => {
  const contract = await Contract.findById(contractId);
  if (!contract) return null;

  contract.endDate = payload.endDate;
  contract.endNotificationDate = payload.endNotificationDate;
  contract.endReason = payload.endReason;
  contract.otherMisc = payload.otherMisc;
  // End active version
  const versionIndex = contract.versions.findIndex(version => version.isActive);
  contract.versions[versionIndex].isActive = false;
  contract.versions[versionIndex].endDate = payload.endDate;
  await contract.save();

  // Update inactivityDate if all contracts are ended
  const userContracts = await Contract.find({ user: contract.user });
  const hasActiveContracts = userContracts.some(c => !c.endDate);
  if (!hasActiveContracts) {
    await User.findOneAndUpdate({ _id: contract.user }, { $set: { inactivityDate: moment().add('1', 'months').startOf('M').toDate() } });
  }

  return contract;
};

const createAndSaveFile = async (administrativeKeys, params, payload) => {
  const uploadedFile = await addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload[administrativeKeys[0]].hapi.filename,
    type: payload['Content-Type'],
    body: payload[administrativeKeys[0]]
  });
  const driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });

  let file = {};
  if (payload.type) {
    if (payload.type === COMPANY_CONTRACT) {
      file = { 'versions.$[version]': { auxiliaryDoc: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink } } };
    }
    if (payload.type === CUSTOMER_CONTRACT) {
      file = { 'versions.$[version]': { customerDoc: { driveId: uploadedFile.id, link: driveFileInfo.webViewLink } } };
    }
  } else {
    file = { 'versions.$[version]': { driveId: uploadedFile.id, link: driveFileInfo.webViewLink } };
  }
  await Contract.findOneAndUpdate(
    { _id: params._id },
    { $set: flat(file) },
    {
      new: true,
      arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(payload.versionId) }],
      autopopulate: false
    }
  );

  return uploadedFile;
};

module.exports = {
  endContract,
  createAndSaveFile,
};
