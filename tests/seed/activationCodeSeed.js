const { ObjectID } = require('mongodb');

const ActivationCode = require('../../models/ActivationCode');

const activationCode = {
  _id: new ObjectID(),
  firstSMS: Date.now(),
  code: '1234',
  userEmail: 'toto@tt.com',
  newUserId: new ObjectID(),
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
