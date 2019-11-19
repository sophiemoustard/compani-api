const { ObjectID } = require('mongodb');
const moment = require('moment');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Sector = require('../../../src/models/Sector');
const Contract = require('../../../src/models/Contract');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const { rolesList, populateDBForAuthentication, authCompany } = require('./authenticationSeed');
const { COMPANY_CONTRACT, HOURLY, MONTHLY } = require('../../../src/helpers/constants');

const sectorList = [{
  _id: new ObjectID(),
  company: authCompany._id,
}];

const contractList = [{
  _id: new ObjectID(),
  status: COMPANY_CONTRACT,
}];

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'White' },
    local: { email: 'white@alenvi.io', password: '123456' },
    role: rolesList.find(role => role.name === 'auxiliary')._id,
    inactivityDate: null,
    sector: sectorList[0]._id,
    contracts: [contractList[0]._id],
  },
];

const serviceList = [{
  _id: new ObjectID(),
  nature: 'hourly',
  company: authCompany._id,
  versions: [
    {
      name: 'Autonomie',
    },
  ],
}];

const subscriptionId = new ObjectID();

const tppId = new ObjectID();
const tppList = [{
  _id: tppId,
  name: 'tiers payeur',
  company: authCompany._id,
}];

const customerList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    subscriptions: [{
      _id: subscriptionId,
      service: serviceList[0]._id,
    }],
    fundings: [{
      nature: HOURLY,
      frequency: MONTHLY,
      subscription: subscriptionId,
      thirdPartyPayer: tppId,
      versions: [{
        _id: new ObjectID(),
        startDate: moment().startOf('month').subtract(2, 'months').toISOString(),
        createdAt: moment().startOf('month').subtract(2, 'months').toISOString(),
        unitTTCRate: 20,
        customerParticipationRate: 60,
        careHours: 40,
        careDays: [0, 1, 2, 3, 4],
      }],
    }],
    identity: { lastname: 'Giscard d\'Estaing' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
      },
      phone: '0612345678',
    },
  },
];

const eventListForFollowUp = [
  {
    _id: new ObjectID(),
    type: 'intervention',
    customer: customerList[0]._id,
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: '2019-07-01T08:00:00.000+00:00',
    endDate: '2019-07-01T09:00:00.000+00:00',
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    customer: customerList[0]._id,
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: '2019-07-02T09:00:00.000+00:00',
    endDate: '2019-07-02T10:30:00.000+00:00',
  },
];

const eventListForFundingsMonitoring = [
  {
    _id: new ObjectID(),
    type: 'intervention',
    customer: customerList[0]._id,
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: moment()
      .startOf('month')
      .add('15', 'days')
      .day(0)
      .hour('12')
      .toISOString(),
    endDate: moment()
      .startOf('month')
      .add('15', 'days')
      .day(0)
      .hour('14')
      .toISOString(),
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    customer: customerList[0]._id,
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: moment()
      .startOf('month')
      .add('15', 'days')
      .day(2)
      .hour('12')
      .toISOString(),
    endDate: moment()
      .startOf('month')
      .add('15', 'days')
      .day(2)
      .hour('15')
      .toISOString(),
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    customer: customerList[0]._id,
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: moment()
      .startOf('month')
      .add('15', 'days')
      .day(6)
      .hour('8')
      .toISOString(),
    endDate: moment()
      .startOf('month')
      .add('15', 'days')
      .day(6)
      .hour('10')
      .toISOString(),
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    customer: customerList[0]._id,
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: moment()
      .startOf('month')
      .add('15', 'days')
      .day(0)
      .hour('13')
      .toISOString(),
    endDate: moment()
      .startOf('month')
      .add('15', 'days')
      .day(0)
      .hour('14')
      .toISOString(),
  },
  {
    _id: new ObjectID(),
    type: 'intervention',
    customer: customerList[0]._id,
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: moment()
      .startOf('month')
      .subtract(1, 'months')
      .add('15', 'days')
      .day(2)
      .hour('10')
      .toISOString(),
    endDate: moment()
      .startOf('month')
      .add('15', 'days')
      .subtract(1, 'months')
      .day(2)
      .hour('14')
      .toISOString(),
  },
];

const populateDBWithEventsForFollowup = async () => {
  await Event.deleteMany({});
  await Event.insertMany(eventListForFollowUp);
};

const populateDBWithEventsForFundingsMonitoring = async () => {
  await Event.deleteMany({});
  await Event.insertMany(eventListForFundingsMonitoring);
};

const populateDB = async () => {
  await User.deleteMany({});
  await Customer.deleteMany({});
  await Service.deleteMany({});
  await Sector.deleteMany({});
  await Contract.deleteMany({});
  await ThirdPartyPayer.deleteMany({});

  await populateDBForAuthentication();
  for (const user of userList) {
    await new User(user).save();
  }
  await Customer.insertMany(customerList);
  await Service.insertMany(serviceList);
  await Sector.insertMany(sectorList);
  await Contract.insertMany(contractList);
  await ThirdPartyPayer.insertMany(tppList);
};

module.exports = {
  customerList,
  populateDB,
  populateDBWithEventsForFollowup,
  populateDBWithEventsForFundingsMonitoring,
};
