const { ObjectID } = require('mongodb');

const { userList } = require('./usersSeed');
const User = require('../../models/User');

const planningUpdatesList = [{
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
}, {
  _id: new ObjectID(),
  content: 'Test2',
  involved: 'M. Tata',
  createdAt: Date.now(),
  modificationType: 'Modification Planning',
  check: {
    isChecked: false,
    checkBy: null,
    checkedAt: null
  }
}];

const populatePlanningUpdates = async () => {
  await User.update({}, { $unset: { planningModification: '' } }, { multi: true });
  await User.findByIdAndUpdate(userList[3]._id, { $push: { planningModification: planningUpdatesList[0] } });
  await User.findByIdAndUpdate(userList[2]._id, { $push: { planningModification: planningUpdatesList[1] } });
};

module.exports = {
  planningUpdatesList,
  populatePlanningUpdates
};
