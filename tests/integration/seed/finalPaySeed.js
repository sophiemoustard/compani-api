const { v4: uuidv4 } = require('uuid');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Contract = require('../../../src/models/Contract');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const UserCompany = require('../../../src/models/UserCompany');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { WEBAPP } = require('../../../src/helpers/constants');
const { auxiliaryRoleId, coachRoleId } = require('../../seed/authRolesSeed');

const contractId = new ObjectID();
const auxiliaryId = new ObjectID();
const customerId = new ObjectID();
const subscriptionId = new ObjectID();
const serviceId = new ObjectID();
const sectorId = new ObjectID();

const user = {
  _id: new ObjectID(),
  local: { email: 'test4@alenvi.io', password: '123456!eR' },
  identity: { lastname: 'Toto' },
  refreshToken: uuidv4(),
  role: { client: coachRoleId },
  inactivityDate: '2018-11-01T12:52:27.461Z',
  origin: WEBAPP,
};

const auxiliary = {
  _id: auxiliaryId,
  identity: { firstname: 'Test7', lastname: 'Test7' },
  local: { email: 'test7@alenvi.io', password: '123456!eR' },
  inactivityDate: '2019-06-01T00:00:00',
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  contracts: contractId,
  origin: WEBAPP,
};

const auxiliaryFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Cricri', lastname: 'test' },
  local: { email: 'othercompany@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  contracts: contractId,
  origin: WEBAPP,
};

const userCompanyList = [
  { _id: new ObjectID(), user: user._id, company: authCompany._id },
  { _id: new ObjectID(), user: auxiliaryId, company: authCompany._id },
  { _id: new ObjectID(), user: auxiliaryFromOtherCompany._id, company: otherCompany._id },
];

const contract = {
  createdAt: '2018-12-04T16:34:04',
  serialNumber: 'aswertyujnmklk',
  endDate: moment('2022-05-28T23:59:59').toDate(),
  endNotificationDate: moment('2022-03-28T00:00:00').toDate(),
  endReason: 'mutation',
  user: auxiliaryId,
  startDate: moment('2018-12-03T00:00:00').toDate(),
  _id: contractId,
  company: authCompany._id,
  versions: [
    {
      createdAt: '2018-12-04T16:34:04',
      endDate: null,
      grossHourlyRate: 10.28,
      startDate: moment('2018-12-03T00:00:00').toDate(),
      weeklyHours: 9,
      _id: new ObjectID(),
    },
  ],
};

const event = {
  _id: new ObjectID(),
  company: authCompany._id,
  type: 'intervention',
  startDate: '2022-05-12T09:00:00',
  endDate: '2022-05-12T11:00:00',
  auxiliary: auxiliaryId,
  customer: customerId,
  createdAt: '2022-05-01T09:00:00',
  sector: new ObjectID(),
  subscription: subscriptionId,
  address: {
    fullAddress: '37 rue de ponthieu 75008 Paris',
    zipCode: '75008',
    city: 'Paris',
    street: '37 rue de Ponthieu',
    location: { type: 'Point', coordinates: [2.377133, 48.801389] },
  },
};

const customer = {
  _id: customerId,
  company: authCompany._id,
  identity: { title: 'mr', firstname: 'Toto', lastname: 'Tata' },
  sectors: ['1e*'],
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  subscriptions: [{
    _id: subscriptionId,
    service: serviceId,
    versions: [{
      unitTTCRate: 12,
      estimatedWeeklyVolume: 12,
      evenings: 2,
      sundays: 1,
      startDate: '2018-01-01T10:00:00.000',
    }],
  }],
};

const service = {
  _id: serviceId,
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    exemptFromCharges: false,
    startDate: '2019-01-16T00:00:00',
    vat: 12,
  }],
  nature: 'hourly',
};

const sector = { name: 'Toto', _id: sectorId, company: authCompany._id };

const sectorHistory = { auxiliary: auxiliaryId, sector: sectorId, company: authCompany._id, startDate: '2018-12-10' };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Sector.create(sector);
  await SectorHistory.create(sectorHistory);
  await User.create([user, auxiliary, auxiliaryFromOtherCompany]);
  await Customer.create(customer);
  await Service.create(service);
  await Event.create(event);
  await Contract.create(contract);
  await UserCompany.insertMany(userCompanyList);
};

module.exports = { populateDB, auxiliary, auxiliaryFromOtherCompany };
