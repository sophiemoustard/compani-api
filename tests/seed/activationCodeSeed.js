const { ObjectID } = require('mongodb');

const { userList } = require('./usersSeed');
const ActivationCode = require('../../models/ActivationCode');

const activationCode = {
  _id: new ObjectID(),
  firstSMS: Date.now(),
  code: '1234',
  mobile_phone: '0765432157',
  sector: '1z*',
  managerId: userList[0]._id
};

const populateActivationCode = async () => {
  await ActivationCode.remove({});
  const code = new ActivationCode(activationCode);
  await code.save();
};

module.exports = {
  activationCode,
  populateActivationCode
};
