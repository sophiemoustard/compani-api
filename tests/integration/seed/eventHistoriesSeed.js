const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const EventHistory = require('../../../src/models/EventHistory');
const {
  INTERNAL_HOUR,
  INTERVENTION,
  ABSENCE,
  PAID_LEAVE,
  EVENT_UPDATE,
  EVENT_DELETION,
  EVENT_CREATION,
} = require('../../../src/helpers/constants');
const { populateDBForAuthentication, rolesList, authCompany, otherCompany } = require('./authenticationSeed');

const user = {
  _id: new ObjectID(),
  identity: { firstname: 'Bob', lastname: 'Marley' },
  local: { email: 'lala@alenvi.io', password: '123456!eR' },
  role: { client: rolesList[1]._id },
  company: authCompany._id,
  refreshToken: uuidv4(),
};

const eventHistoryAuxiliaries = [{
  _id: new ObjectID(),
  identity: { firstname: 'Mimi', lastname: 'Mita' },
  local: { email: 'lili@alenvi.io', password: '123456!eR' },
  role: { client: rolesList[2]._id },
  company: authCompany._id,
  refreshToken: uuidv4(),
}, {
  _id: new ObjectID(),
  identity: { firstname: 'Joséphine', lastname: 'Mita' },
  local: { email: 'lili2@alenvi.io', password: '123456!eR' },
  role: { client: rolesList[2]._id },
  company: authCompany._id,
  refreshToken: uuidv4(),
}];

const sectors = [{
  _id: new ObjectID(),
  company: authCompany._id,
}, {
  _id: new ObjectID(),
  company: authCompany._id,
}];

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
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0612345678',
  },
};

const eventHistoryList = [
  {
    _id: ObjectID(),
    company: authCompany._id,
    action: EVENT_CREATION,
    createdBy: user._id,
    sectors: [sectors[0]._id],
    auxiliaries: [eventHistoryAuxiliaries[0]._id],
    event: {
      type: INTERVENTION,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      customer: customer._id,
      auxiliary: eventHistoryAuxiliaries[0]._id,
    },
  },
  {
    _id: ObjectID(),
    company: authCompany._id,
    action: EVENT_DELETION,
    createdBy: user._id,
    sectors: [sectors[0]._id],
    auxiliaries: [eventHistoryAuxiliaries[0]._id],
    event: {
      type: INTERNAL_HOUR,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      internalHour: {
        name: 'Réunion',
        _id: new ObjectID(),
      },
      auxiliary: eventHistoryAuxiliaries[0]._id,
      misc: 'Je suis une note',
    },
  },
  {
    _id: ObjectID(),
    company: authCompany._id,
    action: EVENT_UPDATE,
    createdBy: user._id,
    sectors: [sectors[0]._id],
    auxiliaries: [eventHistoryAuxiliaries[0]._id],
    event: {
      type: ABSENCE,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      absence: PAID_LEAVE,
      auxiliary: eventHistoryAuxiliaries[0]._id,
      misc: 'Je suis une note',
    },
  },
];

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'test', lastname: 'Mita' },
  local: { email: 'otherCompany@alenvi.io', password: '123456!eR' },
  role: { client: rolesList[2]._id },
  company: otherCompany._id,
  refreshToken: uuidv4(),
};

const populateDB = async () => {
  await Customer.deleteMany({});
  await User.deleteMany({});
  await Sector.deleteMany({});
  await EventHistory.deleteMany({});

  await populateDBForAuthentication();

  await EventHistory.insertMany(eventHistoryList);
  await (new User(user)).save();
  await User.create(eventHistoryAuxiliaries);
  await (new User(auxiliaryFromOtherCompany)).save();
  await (new Customer(customer)).save();
  await Sector.create(sectors);
  await (new Sector(sectorFromOtherCompany)).save();
};

module.exports = {
  populateDB,
  eventHistoryList,
  eventHistoryAuxiliaries,
  auxiliaryFromOtherCompany,
  sectorFromOtherCompany,
  sectors,
};
