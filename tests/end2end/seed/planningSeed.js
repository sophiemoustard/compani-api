const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const { ObjectID } = require('mongodb');
const Event = require('../../../src/models/Event');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const Contract = require('../../../src/models/Contract');
const SectorHistory = require('../../../src/models/SectorHistory');
const Sector = require('../../../src/models/Sector');
const { populateAuthentication } = require('./authenticationSeed');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { rolesList } = require('../../seed/authRolesSeed');
const { userList, userCompaniesList } = require('../../seed/authUsersSeed');
const { NEVER, INTERVENTION, HOURLY, AUXILIARY, WEBAPP } = require('../../../src/helpers/constants');

const subscriptionId = new ObjectID();
const loggedAuxiliary = userList[2];

const service = {
  _id: new ObjectID(),
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    startDate: '2019-01-16T17:58:15',
    vat: 12,
    exemptFromCharges: false,
  }],
  nature: HOURLY,
};

const customer = {
  _id: new ObjectID(),
  identity: { title: 'mr', firstname: 'Romain', lastname: 'Bardet' },
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  subscriptions: [{
    _id: subscriptionId,
    service: service._id,
    versions: [
      { unitTTCRate: 10, estimatedWeeklyVolume: 8, evenings: 0, sundays: 2, createdAt: '2019-06-01T23:00:00' },
    ],
  }],
};

const secondAuxiliary = {
  _id: new ObjectID(),
  identity: { firstname: 'Customer referent', lastname: 'Test', title: 'mr' },
  local: { email: 'customer-referent@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === AUXILIARY)._id },
  company: authCompany._id,
  contact: { phone: '0987654321' },
  contracts: [new ObjectID()],
  origin: WEBAPP,
};

const contracts = [
  {
    createdAt: '2018-12-04T16:34:04.144Z',
    serialNumber: 'msndfasjdhgsd',
    user: loggedAuxiliary._id,
    startDate: '2018-12-03T23:00:00.000Z',
    _id: loggedAuxiliary.contracts[0],
    company: authCompany._id,
    versions: [
      {
        createdAt: '2018-12-04T16:34:04.144Z',
        grossHourlyRate: 10.28,
        startDate: '2018-12-03T23:00:00.000Z',
        weeklyHours: 9,
        _id: new ObjectID(),
      },
    ],
  },
  {
    createdAt: '2018-12-04T16:34:04.144Z',
    serialNumber: 'ejfadjkshfsdhflknsjd',
    user: secondAuxiliary._id,
    startDate: '2018-12-03T23:00:00.000Z',
    _id: secondAuxiliary.contracts[0],
    company: authCompany._id,
    versions: [
      {
        createdAt: '2018-12-04T16:34:04.144Z',
        grossHourlyRate: 10.28,
        startDate: '2018-12-03T23:00:00.000Z',
        weeklyHours: 9,
        _id: new ObjectID(),
      },
    ],
  },
];

const referentHistories = [
  {
    customer: customer._id,
    auxiliary: loggedAuxiliary._id,
    company: customer.company,
    startDate: '2017-05-13T00:00:00',
    endDate: '2018-05-13T23:59:59',
  },
  {
    customer: customer._id,
    auxiliary: secondAuxiliary._id,
    company: customer.company,
    startDate: '2018-05-14T00:00:00',
  },
];

const sectors = [{ _id: new ObjectID(), name: 'Test', company: authCompany._id }];

const sectorHistories = [
  {
    _id: new ObjectID(),
    auxiliary: loggedAuxiliary._id,
    sector: sectors[0]._id,
    startDate: '2020-03-20T00:00:00',
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    auxiliary: secondAuxiliary._id,
    sector: sectors[0]._id,
    startDate: '2020-03-20T00:00:00',
    company: authCompany._id,
  },
];

const eventList = [
  {
    _id: '1234567890abcdef12345678',
    type: INTERVENTION,
    customer: customer._id,
    company: authCompany._id,
    auxiliary: loggedAuxiliary._id,
    repetition: { frequency: NEVER },
    startDate: moment().set('hours', 10).set('minutes', 0),
    endDate: moment().set('hours', 12).set('minutes', 30),
    address: customer.contact.primaryAddress,
    subscription: customer.subscriptions[0]._id,
  },
  {
    _id: '123456789012345678abcdef',
    type: INTERVENTION,
    customer: customer._id,
    company: authCompany._id,
    auxiliary: loggedAuxiliary._id,
    repetition: { frequency: NEVER },
    startDate: moment().subtract(1, 'week').set('hours', 18).set('minutes', 15),
    endDate: moment().subtract(1, 'week').set('hours', 20).set('minutes', 30),
    address: customer.contact.primaryAddress,
    subscription: customer.subscriptions[0]._id,
  },
  {
    _id: 'abcdef123456789012345678',
    type: INTERVENTION,
    customer: customer._id,
    company: authCompany._id,
    auxiliary: loggedAuxiliary._id,
    repetition: { frequency: NEVER },
    startDate: moment().subtract(1, 'week').set('hours', 11).set('minutes', 15),
    endDate: moment().subtract(1, 'week').set('hours', 12).set('minutes', 30),
    address: customer.contact.primaryAddress,
    subscription: customer.subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    type: INTERVENTION,
    customer: customer._id,
    company: authCompany._id,
    auxiliary: secondAuxiliary._id,
    repetition: { frequency: NEVER },
    startDate: moment().subtract(1, 'week').set('hours', 13).set('minutes', 15),
    endDate: moment().subtract(1, 'week').set('hours', 14).set('minutes', 30),
    address: customer.contact.primaryAddress,
    subscription: customer.subscriptions[0]._id,
  },
];

const populatePlanning = async () => {
  await Customer.deleteMany();
  await Service.deleteMany();
  await Event.deleteMany();
  await ReferentHistory.deleteMany();
  await User.deleteMany();
  await UserCompany.deleteMany();
  await Contract.deleteMany();
  await SectorHistory.deleteMany();
  await Sector.deleteMany();
  await UserCompany.deleteMany();

  await populateAuthentication();

  await Event.insertMany(eventList);
  await ReferentHistory.insertMany(referentHistories);
  await Customer.create(customer);
  await Service.create(service);
  await User.create(secondAuxiliary);
  await UserCompany.create(userCompaniesList);
  await Contract.insertMany(contracts);
  await SectorHistory.insertMany(sectorHistories);
  await Sector.insertMany(sectors);
};

module.exports = { populatePlanning };
