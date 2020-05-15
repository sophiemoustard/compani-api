const moment = require('moment');
const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');
const Event = require('../../../src/models/Event');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const { populateAuthentication } = require('./authenticationSeed');
const { authCompany } = require('../../seed/companySeed');
const { authCustomer } = require('../../seed/customerSeed');
const { userList } = require('../../seed/userSeed');
const { rolesList } = require('../../seed/roleSeed');
const { NEVER, INTERVENTION, COMPANY_CONTRACT, HOURLY, AUXILIARY } = require('../../../src/helpers/constants');

const subscriptionId = new ObjectID();

const service = {
  _id: new ObjectID(),
  type: COMPANY_CONTRACT,
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
  ...authCustomer,
  email: 'fake@test.com',
  identity: {
    title: 'mr',
    firstname: 'Romain',
    lastname: 'Bardet',
  },
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

const auxiliaries = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'Test', title: 'mr' },
    local: { email: 'customer-referent-1@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === AUXILIARY)._id },
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Referent', lastname: 'Test', title: 'mr' },
    local: { email: 'customer-referent-2@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === AUXILIARY)._id },
    company: authCompany._id,
    contact: { phone: '0987654321' },
  },
];

const referentHistories = [
  {
    customer: customer._id,
    auxiliary: auxiliaries[0]._id,
    company: customer.company,
    startDate: '2017-05-13T00:00:00',
    endDate: '2018-05-13T23:59:59',
  },
  {
    customer: customer._id,
    auxiliary: auxiliaries[1]._id,
    company: customer.company,
    startDate: '2018-05-14T00:00:00',
  },
];

const eventList = [
  {
    _id: '1234567890abcdef12345678',
    type: INTERVENTION,
    status: COMPANY_CONTRACT,
    customer: customer._id,
    company: authCompany._id,
    auxiliary: userList[2]._id,
    repetition: { frequency: NEVER },
    startDate: moment().set('hours', 10).set('minutes', 0),
    endDate: moment().set('hours', 12).set('minutes', 30),
    address: customer.contact.primaryAddress,
    subscription: customer.subscriptions[0]._id,
  },
  {
    _id: '123456789012345678abcdef',
    type: INTERVENTION,
    status: COMPANY_CONTRACT,
    customer: customer._id,
    company: authCompany._id,
    auxiliary: userList[2]._id,
    repetition: { frequency: NEVER },
    startDate: moment().subtract(1, 'week').set('hours', 18).set('minutes', 15),
    endDate: moment().subtract(1, 'week').set('hours', 20).set('minutes', 30),
    address: customer.contact.primaryAddress,
    subscription: customer.subscriptions[0]._id,
  },
  {
    _id: 'abcdef123456789012345678',
    type: INTERVENTION,
    status: COMPANY_CONTRACT,
    customer: customer._id,
    company: authCompany._id,
    auxiliary: userList[4]._id,
    repetition: { frequency: NEVER },
    startDate: moment().subtract(1, 'week').set('hours', 11).set('minutes', 15),
    endDate: moment().subtract(1, 'week').set('hours', 12).set('minutes', 30),
    address: customer.contact.primaryAddress,
    subscription: customer.subscriptions[0]._id,
  },
];

const populatePlanning = async () => {
  await Customer.deleteMany({});
  await Service.deleteMany({});
  await Event.deleteMany({});
  await ReferentHistory.deleteMany({});

  await populateAuthentication();

  await Event.insertMany(eventList);
  await ReferentHistory.insertMany(referentHistories);
  await (new Customer(customer)).save();
  await new Service(service).save();
};

module.exports = { populatePlanning };
