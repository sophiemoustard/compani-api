const { ObjectID } = require('mongodb');

const { userList } = require('./usersSeed');
const User = require('../../models/User');

const planningUpdate = {
  _id: new ObjectID(),
  content: 'Test',
  involved: 'M. Toto',
  createdAt: Date.now(),
  modificationType: 'Heures Internes',
  check: {
    isChecked: false,
    checkBy: null,
    checkedAt: null
  }
};

const populatePlanningUpdates = async () => {
  await User.update({}, { $unset: { planningModification: '' } }, { multi: true });
  await User.findByIdAndUpdate(userList[3]._id, { $push: { planningModification: planningUpdate } });
};

module.exports = {
  planningUpdate,
  populatePlanningUpdates
};
