const { ObjectID } = require('mongodb');

const { userList } = require('./usersSeed');
const User = require('../../../models/User');

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
  content: 'Test',
  involved: 'M. Titi',
  createdAt: Date.now(),
  modificationType: 'Heures Internes',
  check: {
    isChecked: true,
    checkBy: userList[0]._id,
    checkedAt: Date.now() + 3600000
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

const planningUpdatePayload = {
  content: 'Test Test',
  involved: 'Mme Tutu',
  type: 'Super Test'
};

const statusPayload = {
  isChecked: true,
  checkBy: userList[0]._id,
  checkedAt: Date.now()
};

const populatePlanningUpdates = async () => {
  await User.update({}, { $unset: { planningModification: '' } }, { multi: true });
  await User.findByIdAndUpdate(userList[3]._id, { $push: { planningModification: { $each: [planningUpdatesList[0], planningUpdatesList[1]] } } });
  await User.findByIdAndUpdate(userList[2]._id, { $push: { planningModification: planningUpdatesList[2] } });
};

module.exports = {
  planningUpdatesList,
  planningUpdatePayload,
  statusPayload,
  populatePlanningUpdates
};
