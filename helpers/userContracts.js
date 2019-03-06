const flat = require('flat');
const mongoose = require('mongoose');

const Contract = require('../models/Contract');
const drive = require('../models/Google/Drive');
const { addFile } = require('./gdriveStorage');

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

  // Update inactivityDate if all contracts are ended
  // const activeContract = user.administrative.contracts.find(contract => !contract.endDate);
  // user.inactivityDate = !activeContract ? moment().add('1', 'months').date(1).toDate() : null;

  await contract.save();

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

  const file = { 'versions.$[version]': { driveId: uploadedFile.id, link: driveFileInfo.webViewLink } };
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
