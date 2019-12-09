const { ObjectID } = require('mongodb');
const moment = require('../../../src/extensions/moment');
const cloneDeep = require('lodash/cloneDeep');
const uuidv4 = require('uuid/v4');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Sector = require('../../../src/models/Sector');
const Contract = require('../../../src/models/Contract');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const { rolesList, populateDBForAuthentication, authCompany } = require('./authenticationSeed');
const { COMPANY_CONTRACT, HOURLY, MONTHLY, ONCE, FIXED, DAILY, PAID_LEAVE } = require('../../../src/helpers/constants');

const sectorList = [{
  _id: new ObjectID(),
  company: authCompany._id,
}];

const contractList = [{
  _id: new ObjectID(),
  user: new ObjectID(),
  company: authCompany._id,
  status: COMPANY_CONTRACT,
  startDate: '2010-09-03T00:00:00',
  versions: [{
    startDate: '2010-09-03T00:00:00',
    grossHourlyRate: 10.43,
    weeklyHours: 12,
  }],
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
    company: authCompany._id,
    refreshToken: uuidv4(),
  },
];

const serviceList = [{
  _id: new ObjectID(),
  type: COMPANY_CONTRACT,
  nature: 'hourly',
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 150,
    name: 'Service 3',
    startDate: '2019-01-16 17:58:15.519',
    exemptFromCharges: false,
    vat: 12,
  }],
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
        startDate: moment().startOf('month').subtract(2, 'months').toDate(),
        createdAt: moment().startOf('month').subtract(2, 'months').toDate(),
        unitTTCRate: 20,
        customerParticipationRate: 60,
        careHours: 40,
        careDays: [0, 1, 2, 3, 4],
      }],
    },
    {
      nature: HOURLY,
      frequency: ONCE,
      subscription: subscriptionId,
      thirdPartyPayer: tppId,
      versions: [{
        _id: new ObjectID(),
        startDate: moment().startOf('month').subtract(2, 'months').toDate(),
        createdAt: moment().startOf('month').subtract(2, 'months').toDate(),
        unitTTCRate: 20,
        customerParticipationRate: 60,
        careHours: 40,
        careDays: [0, 1, 2, 3, 4],
      }],
    },
    {
      nature: FIXED,
      frequency: MONTHLY,
      subscription: subscriptionId,
      thirdPartyPayer: tppId,
      versions: [{
        _id: new ObjectID(),
        startDate: moment().startOf('month').subtract(2, 'months').toDate(),
        createdAt: moment().startOf('month').subtract(2, 'months').toDate(),
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
    company: authCompany._id,
    type: 'intervention',
    customer: customerList[0]._id,
    status: COMPANY_CONTRACT,
    sector: new ObjectID(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: '2019-07-01T08:00:00.000+00:00',
    endDate: '2019-07-01T09:00:00.000+00:00',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    status: COMPANY_CONTRACT,
    customer: customerList[0]._id,
    sector: new ObjectID(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: '2019-07-02T09:00:00.000+00:00',
    endDate: '2019-07-02T10:30:00.000+00:00',
  },
];

const dayOfCurrentMonth = (day) => {
  const startOfMonth = moment().startOf('month');
  if (!moment(startOfMonth)
    .add('7', 'days')
    .day(day).startOf('d')
    .isHoliday()) return moment(startOfMonth).add('7', 'days').day(day);
  if (!moment(startOfMonth)
    .add('14', 'days')
    .day(day).startOf('d')
    .isHoliday()) return moment(startOfMonth).add('14', 'days').day(day);
  return moment(startOfMonth).add('21', 'days').day(day);
};

const mondayOfCurrentMonth = dayOfCurrentMonth(1);
const tuesdayOfCurrentMonth = dayOfCurrentMonth(2);
const saturdayOfCurrentMonth = dayOfCurrentMonth(0);

const dayOfPreviousMonth = (day) => {
  const startOfMonth = moment().subtract(1, 'month').startOf('month');
  if (!moment(startOfMonth)
    .add('7', 'days')
    .day(day).startOf('d')
    .isHoliday()) return moment(startOfMonth).add('7', 'days').day(day);
  if (!moment(startOfMonth)
    .add('14', 'days')
    .day(day).startOf('d')
    .isHoliday()) return moment(startOfMonth).add('14', 'days').day(day);
  return moment(startOfMonth).add('21', 'days').day(day);
};

const tuesdayOfPreviousMonth = dayOfPreviousMonth(2);

const eventListForFundingsMonitoring = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
    status: COMPANY_CONTRACT,
    customer: customerList[0]._id,
    sector: new ObjectID(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: cloneDeep(mondayOfCurrentMonth).hour('12').toDate(),
    endDate: cloneDeep(mondayOfCurrentMonth).hour('14').toDate(),
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    status: COMPANY_CONTRACT,
    type: 'intervention',
    customer: customerList[0]._id,
    sector: new ObjectID(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: cloneDeep(tuesdayOfCurrentMonth).hour('12').toDate(),
    endDate: cloneDeep(tuesdayOfCurrentMonth).hour('15').toDate(),
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    status: COMPANY_CONTRACT,
    type: 'intervention',
    customer: customerList[0]._id,
    sector: new ObjectID(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: cloneDeep(saturdayOfCurrentMonth).hour('8').toDate(),
    endDate: cloneDeep(saturdayOfCurrentMonth).hour('10').toDate(),
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    status: COMPANY_CONTRACT,
    type: 'intervention',
    customer: customerList[0]._id,
    sector: new ObjectID(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: cloneDeep(mondayOfCurrentMonth).hour('13').toDate(),
    endDate: cloneDeep(mondayOfCurrentMonth).hour('14').toDate(),
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    status: COMPANY_CONTRACT,
    type: 'intervention',
    customer: customerList[0]._id,
    sector: new ObjectID(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: cloneDeep(tuesdayOfPreviousMonth).hour('10').toDate(),
    endDate: cloneDeep(tuesdayOfPreviousMonth).hour('14').toDate(),
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
