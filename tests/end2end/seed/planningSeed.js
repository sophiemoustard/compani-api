const { v4: uuidv4 } = require('uuid');
const { ObjectID } = require('mongodb');
const Event = require('../../../src/models/Event');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const User = require('../../../src/models/User');
const Contract = require('../../../src/models/Contract');
const UserCompany = require('../../../src/models/UserCompany');
const SectorHistory = require('../../../src/models/SectorHistory');
const Sector = require('../../../src/models/Sector');
const Helper = require('../../../src/models/Helper');
const { populateAuthentication } = require('./authenticationSeed');
const { authCompany } = require('../../seed/companySeed');
const { rolesList } = require('../../seed/roleSeed');
const { userList, helper } = require('../../seed/userSeed');
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
  company: authCompany._id,
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

const userCompanyList = [{ user: secondAuxiliary, company: authCompany._id }];
const helpersList = [{ user: helper._id, customer: customer._id, company: authCompany._id, referent: true }];

const contracts = [
  {
    createdAt: '2018-12-04T16:34:04',
    serialNumber: 'msndfasjdhgsd',
    user: loggedAuxiliary._id,
    startDate: '2018-12-03T23:00:00.000Z',
    _id: loggedAuxiliary.contracts[0],
    company: authCompany._id,
    versions: [
      {
        createdAt: '2018-12-04T16:34:04',
        grossHourlyRate: 10.28,
        startDate: '2018-12-03T23:00:00.000Z',
        weeklyHours: 9,
        _id: new ObjectID(),
      },
    ],
  },
  {
    createdAt: '2018-12-04T16:34:04',
    serialNumber: 'ejfadjkshfsdhflknsjd',
    user: secondAuxiliary._id,
    startDate: '2018-12-03T23:00:00.000Z',
    _id: secondAuxiliary.contracts[0],
    company: authCompany._id,
    versions: [
      {
        createdAt: '2018-12-04T16:34:04',
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
    startDate: '2020-02-20T00:00:00',
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    auxiliary: secondAuxiliary._id,
    sector: sectors[0]._id,
    startDate: '2020-02-20T00:00:00',
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
    startDate: '2020-03-03T10:00:00',
    endDate: '2020-03-03T12:30:00',
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
    startDate: '2020-02-27T18:15:00',
    endDate: '2020-02-27T20:30:00',
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
    startDate: '2020-02-27T11:15:00',
    endDate: '2020-02-27T12:30:00',
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
    startDate: '2020-02-27T13:15:00',
    endDate: '2020-02-27T14:30:00',
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
  await Helper.deleteMany();

  await populateAuthentication();

  await Event.insertMany(eventList);
  await ReferentHistory.insertMany(referentHistories);
  await Customer.create(customer);
  await Service.create(service);
  await User.create(secondAuxiliary);
  await UserCompany.create(userCompanyList);
  await Contract.insertMany(contracts);
  await SectorHistory.insertMany(sectorHistories);
  await Helper.insertMany(helpersList);
  await Sector.insertMany(sectors);
};

module.exports = { populatePlanning };
