const Contract = require('../models/Contract');

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

module.exports = {
  endContract,
};
