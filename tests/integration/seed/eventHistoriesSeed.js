const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const EventHistory = require('../../../src/models/EventHistory');
const { populateDBForAuthentication, rolesList, authCompany, otherCompany } = require('./authenticationSeed');

const user = {
  _id: new ObjectID(),
  identity: { firstname: 'Bob', lastname: 'Marley' },
  local: { email: 'lala@alenvi.io', password: '123456' },
  role: rolesList[1]._id,
  company: authCompany._id,
  refreshToken: uuidv4(),
};

const eventHistoryAuxiliary = {
  _id: new ObjectID(),
  identity: { firstname: 'Mimi', lastname: 'Mita' },
  local: { email: 'lili@alenvi.io', password: '123456' },
  role: rolesList[2]._id,
  company: authCompany._id,
  refreshToken: uuidv4(),
};

const sector = {
  _id: new ObjectID(),
  company: authCompany._id,
};

const sectorFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
};

const customer = {
  _id: new ObjectID(),
  company: authCompany._id,
  identity: { firstname: 'Julian', lastname: 'Alaphilippe' },
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
    },
    phone: '0612345678',
  },
};

const eventHistoryList = [
  {
    _id: ObjectID(),
    company: authCompany._id,
    action: 'event_creation',
    createdBy: user._id,
    sectors: [sector._id],
    auxiliaries: [eventHistoryAuxiliary._id],
    event: {
      type: 'intervention',
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      customer: customer._id,
      auxiliary: eventHistoryAuxiliary._id,
    },
  },
  {
    _id: ObjectID(),
    company: authCompany._id,
    action: 'event_deletion',
    createdBy: user._id,
    sectors: [sector._id],
    auxiliaries: [eventHistoryAuxiliary._id],
    event: {
      type: 'internalHour',
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      internalHour: {
        name: 'Réunion',
        _id: new ObjectID(),
      },
      auxiliary: eventHistoryAuxiliary._id,
      misc: 'Je suis une note',
    },
  },
  {
    _id: ObjectID(),
    company: authCompany._id,
    action: 'event_update',
    createdBy: user._id,
    sectors: [sector._id],
    auxiliaries: [eventHistoryAuxiliary._id],
    event: {
      type: 'absence',
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      absence: 'leave',
      auxiliary: eventHistoryAuxiliary._id,
      misc: 'Je suis une note',
    },
  },
];

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'test', lastname: 'Mita' },
  local: { email: 'otherCompany@alenvi.io', password: '123456' },
  role: rolesList[2]._id,
  company: otherCompany._id,
  refreshToken: uuidv4(),
}

const populateDB = async () => {
  await Customer.deleteMany({});
  await User.deleteMany({});
  await Sector.deleteMany({});
  await EventHistory.deleteMany({});

  await populateDBForAuthentication();

  await EventHistory.insertMany(eventHistoryList);
  await (new User(user)).save();
  await (new User(eventHistoryAuxiliary)).save();
  await (new User(auxiliaryFromOtherCompany)).save();
  await (new Customer(customer)).save();
  await (new Sector(sector)).save();
  await (new Sector(sectorFromOtherCompany)).save();
};

module.exports = {
  populateDB,
  eventHistoryList,
  eventHistoryAuxiliary,
  auxiliaryFromOtherCompany,
  sectorFromOtherCompany,
  sector,
};
