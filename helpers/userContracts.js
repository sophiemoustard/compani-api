const flat = require('flat');
const moment = require('moment');
const User = require('../models/User');
const { dissociateEmployeeFromService } = require('./dissociateEmployeeFromService');

const endUserContract = async (params, payload) => {
  const user = await User.findById(params._id);
  if (!user) {
    return null;
  }

  const contractIndex = user.administrative.contracts.findIndex(contract => contract._id == params.contractId);
  if (contractIndex === -1) {
    return null;
  }

  user.administrative.contracts[contractIndex].endDate = payload.endDate;
  user.administrative.contracts[contractIndex].endNotificationDate = payload.endNotificationDate;
  user.administrative.contracts[contractIndex].endReason = payload.endReason;
  user.administrative.contracts[contractIndex].otherMisc = payload.otherMisc;

  // End active version
  const versionIndex = user.administrative.contracts[contractIndex].versions.findIndex(version => version.isActive);
  user.administrative.contracts[contractIndex].versions[versionIndex].isActive = false;
  user.administrative.contracts[contractIndex].versions[versionIndex].endDate = payload.endDate;

  // Update inactivityDate if all contracts are ended
  const activeContract = user.administrative.contracts.find(contract => !contract.endDate);
  user.inactivityDate = !activeContract ? moment().add('1', 'months').date(1).toDate() : null;

  await user.save();
  await dissociateEmployeeFromService({ from: payload.endDate, id_employee: user.id_employee });

  return user;
};

const updateUser = async (params, payload) => {
  const contractPayload = { 'administrative.contracts.$': { ...payload } };

  return User.findOneAndUpdate(
    {
      _id: params._id,
      'administrative.contracts._id': params.contractId,
    },
    { $set: flat(contractPayload) },
    {
      new: true,
      select: {
        identity: 1,
        employee_id: 1,
        'administrative.contracts': 1,
      },
      autopopulate: false,
    }
  ).lean();
};

module.exports = {
  endUserContract,
  updateUser,
};
