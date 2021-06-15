const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const EventHistory = require('../../../src/models/EventHistory');
const Event = require('../../../src/models/Event');
const UserCompany = require('../../../src/models/UserCompany');
const {
  INTERNAL_HOUR,
  INTERVENTION,
  ABSENCE,
  PAID_LEAVE,
  EVENT_UPDATE,
  EVENT_DELETION,
  EVENT_CREATION,
  WEBAPP,
} = require('../../../src/helpers/constants');
const { populateDBForAuthentication, rolesList, authCompany, otherCompany } = require('./authenticationSeed');

const users = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Mimi', lastname: 'Mita' },
    local: { email: 'lili@alenvi.io', password: '123456!eR' },
    role: { client: rolesList[2]._id },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Joséphine', lastname: 'Mita' },
    local: { email: 'lili2@alenvi.io', password: '123456!eR' },
    role: { client: rolesList[2]._id },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Bob', lastname: 'Marley' },
    local: { email: 'lala@alenvi.io', password: '123456!eR' },
    role: { client: rolesList[1]._id },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'test', lastname: 'Mita' },
    local: { email: 'otherCompany@alenvi.io', password: '123456!eR' },
    role: { client: rolesList[2]._id },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
];

const auxiliaries = [users[0], users[1]];
const auxiliaryFromOtherCompany = users[3];

const userCompanies = [
  { user: users[0], company: authCompany._id },
  { user: users[1], company: authCompany._id },
  { user: users[2], company: authCompany._id },
  { user: users[3], company: otherCompany._id },
];

const sectors = [{ _id: new ObjectID(), company: authCompany._id }, { _id: new ObjectID(), company: authCompany._id }];

const sectorFromOtherCompany = { _id: new ObjectID(), company: otherCompany._id };

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

const events = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERVENTION,
    startDate: '2019-01-20T09:38:18',
    endDate: '2019-01-20T11:38:18',
    customer: customer._id,
    auxiliary: auxiliaries[0]._id,
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    subscription: new ObjectID(),
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: INTERNAL_HOUR,
    startDate: '2019-01-20T09:38:18',
    endDate: '2019-01-20T11:38:18',
    internalHour: { name: 'Réunion', _id: new ObjectID() },
    auxiliary: auxiliaries[0]._id,
    misc: 'Je suis une note',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: ABSENCE,
    absenceNature: 'daily',
    startDate: '2019-01-20T09:38:18',
    endDate: '2019-01-20T11:38:18',
    absence: PAID_LEAVE,
    auxiliary: auxiliaries[0]._id,
    misc: 'Je suis une note',
  },
];

const eventHistoryList = [
  {
    _id: ObjectID(),
    company: authCompany._id,
    action: EVENT_CREATION,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[0]._id,
      type: INTERVENTION,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      customer: customer._id,
      auxiliary: auxiliaries[0]._id,
    },
  },
  {
    _id: ObjectID(),
    company: authCompany._id,
    action: EVENT_DELETION,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[1]._id,
      type: INTERNAL_HOUR,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      internalHour: { name: 'Réunion', _id: new ObjectID() },
      auxiliary: auxiliaries[0]._id,
      misc: 'Je suis une note',
    },
  },
  {
    _id: ObjectID(),
    company: authCompany._id,
    action: EVENT_UPDATE,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[2]._id,
      type: ABSENCE,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      absence: PAID_LEAVE,
      auxiliary: auxiliaries[0]._id,
      misc: 'Je suis une note',
    },
  },
];

const populateDB = async () => {
  await Customer.deleteMany();
  await User.deleteMany();
  await Sector.deleteMany();
  await EventHistory.deleteMany();
  await Event.deleteMany();
  await UserCompany.deleteMany();

  await populateDBForAuthentication();

  await EventHistory.insertMany(eventHistoryList);
  await UserCompany.insertMany(userCompanies);
  for (const u of users) {
    await (new User(u)).save();
  }
  await (new Customer(customer)).save();
  await Sector.create(sectors);
  await (new Sector(sectorFromOtherCompany)).save();
  await Event.insertMany(events);
};

module.exports = {
  populateDB,
  eventHistoryList,
  auxiliaries,
  auxiliaryFromOtherCompany,
  sectorFromOtherCompany,
  sectors,
};
