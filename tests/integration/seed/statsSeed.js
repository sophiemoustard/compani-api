const { ObjectId } = require('mongodb');
const cloneDeep = require('lodash/cloneDeep');
const { v4: uuidv4 } = require('uuid');
const moment = require('../../../src/extensions/moment');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const Contract = require('../../../src/models/Contract');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const UserCompany = require('../../../src/models/UserCompany');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const {
  HOURLY,
  MONTHLY,
  ONCE,
  FIXED,
  INVOICED_AND_PAID,
  INVOICED_AND_NOT_PAID,
  CUSTOMER_INITIATIVE,
  INTERNAL_HOUR,
  INTERVENTION,
  WEBAPP,
} = require('../../../src/helpers/constants');
const { auxiliaryRoleId } = require('../../seed/authRolesSeed');

const sectorList = [
  { _id: new ObjectId(), name: 'Vénus', company: authCompany._id },
  { _id: new ObjectId(), name: 'Neptune', company: authCompany._id },
  { _id: new ObjectId(), name: 'Mars', company: otherCompany._id },
];

const internalHoursList = [
  { _id: new ObjectId(), company: authCompany._id, name: 'Planning' },
  { _id: new ObjectId(), company: authCompany._id, name: 'Formation' },
];

const contractList = [{
  _id: new ObjectId(),
  serialNumber: 'qsdcfbgfdsasdfv',
  user: new ObjectId(),
  company: authCompany._id,
  startDate: '2010-09-03T00:00:00',
  versions: [{ startDate: '2010-09-03T00:00:00', grossHourlyRate: 10.43, weeklyHours: 12 }],
}];

const userList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary', lastname: 'White' },
    local: { email: 'white@alenvi.io' },
    role: { client: auxiliaryRoleId },
    contracts: [contractList[0]._id],
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary', lastname: 'Black' },
    local: { email: 'black@alenvi.io' },
    role: { client: auxiliaryRoleId },
    inactivityDate: '2019-01-01T23:59:59',
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary', lastname: 'Red' },
    local: { email: 'blue@alenvi.io' },
    role: { client: auxiliaryRoleId },
    inactivityDate: '2019-01-01T23:59:59',
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
];

const userCompanyList = [
  { _id: new ObjectId(), user: userList[0], company: authCompany._id },
  { _id: new ObjectId(), user: userList[1], company: authCompany._id },
  { _id: new ObjectId(), user: userList[2], company: otherCompany._id },
];

const sectorHistoryList = [
  {
    auxiliary: userList[0]._id,
    sector: sectorList[0]._id,
    company: authCompany._id,
    startDate: '2019-05-12T23:00:00.000+00:00',
    endDate: '2019-11-10T22:59:00.000+00:00',
  },
  {
    auxiliary: userList[0]._id,
    sector: sectorList[1]._id,
    company: authCompany._id,
    startDate: '2019-11-11T23:00:00.000+00:00',
  },
  {
    auxiliary: userList[1]._id,
    sector: sectorList[0]._id,
    company: authCompany._id,
    startDate: '2019-05-12T23:00:00.000+00:00',
    endDate: '2020-02-12T22:59:00.000+00:00',
  },
  {
    auxiliary: userList[1]._id,
    sector: sectorList[1]._id,
    company: authCompany._id,
    startDate: '2020-02-12T23:00:00.000+00:00',
  },
];

const serviceList = [
  {
    _id: new ObjectId(),
    nature: 'hourly',
    company: authCompany._id,
    versions: [
      {
        defaultUnitAmount: 150,
        name: 'Service 3',
        startDate: '2019-01-16 17:58:15.519',
        exemptFromCharges: false,
        vat: 12,
      },
    ],
  },
];

const subscriptionId = new ObjectId();

const tppId = new ObjectId();
const tppList = [
  {
    _id: tppId,
    name: 'tiers payeur',
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
  },
];

const subscriptionWithEndedFundingId = new ObjectId();

const customerList = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    subscriptions: [{ _id: subscriptionId, service: serviceList[0]._id }],
    fundings: [
      {
        nature: HOURLY,
        frequency: MONTHLY,
        subscription: subscriptionId,
        thirdPartyPayer: tppId,
        versions: [
          {
            _id: new ObjectId(),
            startDate: moment().startOf('month').subtract(2, 'months').toDate(),
            createdAt: moment().startOf('month').subtract(2, 'months').toDate(),
            unitTTCRate: 20,
            customerParticipationRate: 60,
            careHours: 40,
            careDays: [0, 1, 2, 3, 4],
          },
        ],
      },
      {
        nature: HOURLY,
        frequency: ONCE,
        subscription: subscriptionId,
        thirdPartyPayer: tppId,
        versions: [
          {
            _id: new ObjectId(),
            startDate: moment().startOf('month').subtract(2, 'months').toDate(),
            createdAt: moment().startOf('month').subtract(2, 'months').toDate(),
            unitTTCRate: 20,
            customerParticipationRate: 60,
            careHours: 40,
            careDays: [0, 1, 2, 3, 4],
          },
        ],
      },
      {
        nature: FIXED,
        frequency: MONTHLY,
        subscription: subscriptionId,
        thirdPartyPayer: tppId,
        versions: [
          {
            _id: new ObjectId(),
            startDate: moment().startOf('month').subtract(2, 'months').toDate(),
            createdAt: moment().startOf('month').subtract(2, 'months').toDate(),
            unitTTCRate: 20,
            customerParticipationRate: 60,
            careHours: 40,
            careDays: [0, 1, 2, 3, 4],
          },
        ],
      },
    ],
    identity: { lastname: 'Giscard d\'Estaing' },
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
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    subscriptions: [{ _id: subscriptionWithEndedFundingId, service: serviceList[0]._id }],
    identity: { lastname: 'test' },
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
    fundings: [
      {
        nature: HOURLY,
        frequency: MONTHLY,
        subscription: subscriptionWithEndedFundingId,
        thirdPartyPayer: tppId,
        versions: [
          {
            _id: new ObjectId(),
            startDate: '2019-07-01T08:00:00.000+00:00',
            endDate: '2019-07-01T10:00:00.000+00:00',
            createdAt: moment().startOf('month').subtract(2, 'months').toDate(),
            unitTTCRate: 20,
            customerParticipationRate: 60,
            careHours: 40,
            careDays: [0, 1, 2, 3, 4, 5, 6, 7],
          },
        ],
      },
    ],
  },
];

const referentList = [
  {
    auxiliary: userList[0]._id,
    customer: customerList[0]._id,
    company: customerList[0].company,
    startDate: new Date('2019-03-12'),
    endDate: new Date('2020-01-10'),
  },
  {
    auxiliary: userList[1]._id,
    customer: customerList[0]._id,
    company: customerList[0].company,
    startDate: new Date('2020-01-11'),
    endDate: moment().add(1, 'days').toDate(),
  },
  {
    auxiliary: userList[2]._id,
    customer: customerList[0]._id,
    company: customerList[0].company,
    startDate: moment().add(2, 'days').toDate(),
  },
  {
    auxiliary: userList[0]._id,
    customer: customerList[1]._id,
    company: customerList[1].company,
    startDate: new Date('2018-03-12'),
  },
];

const customerFromOtherCompany = {
  _id: new ObjectId(),
  company: otherCompany._id,
  identity: { lastname: 'Bonjour' },
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

const eventListForFollowUp = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: '2019-07-01T08:00:00.000+00:00',
    endDate: '2019-07-01T09:00:00.000+00:00',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[1]._id,
    sector: new ObjectId(),
    subscription: subscriptionWithEndedFundingId,
    auxiliary: userList[0]._id,
    startDate: '2019-07-01T10:00:00.000+00:00',
    endDate: '2019-07-01T11:00:00.000+00:00',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[1]._id,
    sector: new ObjectId(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: '2019-07-02T09:00:00.000+00:00',
    endDate: '2019-07-02T10:30:00.000+00:00',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: subscriptionId,
    auxiliary: userList[1]._id,
    startDate: '2019-07-02T09:00:00.000+00:00',
    endDate: '2019-07-02T10:30:00.000+00:00',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: '2019-11-09T09:00:00.000+00:00',
    endDate: '2019-11-09T10:30:00.000+00:00',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[1]._id,
    sector: new ObjectId(),
    subscription: customerList[1].subscriptions[0]._id,
    auxiliary: userList[0]._id,
    startDate: '2019-11-13T09:00:00.000+00:00',
    endDate: '2019-11-13T11:30:00.000+00:00',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: customerList[1].subscriptions[0]._id,
    auxiliary: userList[1]._id,
    startDate: '2019-11-13T09:00:00.000+00:00',
    endDate: '2019-11-13T11:30:00.000+00:00',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: customerList[0].subscriptions[0]._id,
    auxiliary: userList[0]._id,
    startDate: '2020-01-04T09:00:00.000+00:00',
    endDate: '2020-01-04T11:30:00.000+00:00',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: customerList[0].subscriptions[0]._id,
    auxiliary: userList[1]._id,
    startDate: '2020-01-13T09:00:00.000+00:00',
    endDate: '2020-01-13T10:30:00.000+00:00',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectId(),
    type: INTERNAL_HOUR,
    startDate: '2019-07-12T09:00:00',
    endDate: '2019-07-12T10:00:00',
    internalHour: internalHoursList[0]._id,
    auxiliary: userList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectId(),
    type: INTERNAL_HOUR,
    startDate: '2019-11-02T09:00:00',
    endDate: '2019-11-02T11:00:00',
    internalHour: internalHoursList[0]._id,
    auxiliary: userList[0]._id,
    company: authCompany._id,
  },
];

const dayOfCurrentMonth = (day) => {
  const startOfMonth = moment().startOf('month');

  if (!startOfMonth.add('7', 'days').day(day).startOf('d').isHoliday()) return startOfMonth.add('7', 'days').day(day);
  if (!startOfMonth.add('14', 'days').day(day).startOf('d').isHoliday()) return startOfMonth.add('14', 'days').day(day);
  return startOfMonth.add('21', 'days').day(day);
};

const mondayOfCurrentMonth = dayOfCurrentMonth(1);
const tuesdayOfCurrentMonth = dayOfCurrentMonth(2);
const sundayOfCurrentMonth = dayOfCurrentMonth(0);

const dayOfPreviousMonth = (day) => {
  const startOfMonth = moment().subtract(1, 'month').startOf('month');

  if (!startOfMonth.add('7', 'days').day(day).startOf('d').isHoliday()) return startOfMonth.add('7', 'days').day(day);
  if (!startOfMonth.add('14', 'days').day(day).startOf('d').isHoliday()) return startOfMonth.add('14', 'days').day(day);
  return startOfMonth.add('21', 'days').day(day);
};

const tuesdayOfPreviousMonth = dayOfPreviousMonth(2);

const eventListForFundingsMonitoring = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: cloneDeep(mondayOfCurrentMonth).hour('12').toDate(),
    endDate: cloneDeep(mondayOfCurrentMonth).hour('14').toDate(),
    address: {
      street: '37 rue de Ponthieu',
      zipCode: '75008',
      city: 'Paris',
      fullAddress: '37 rue de Ponthieu 75008 Paris',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: cloneDeep(tuesdayOfCurrentMonth).hour('12').toDate(),
    endDate: cloneDeep(tuesdayOfCurrentMonth).hour('15').toDate(),
    address: {
      street: '37 rue de Ponthieu',
      zipCode: '75008',
      city: 'Paris',
      fullAddress: '37 rue de Ponthieu 75008 Paris',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    startDate: cloneDeep(sundayOfCurrentMonth).hour('8').toDate(),
    endDate: cloneDeep(sundayOfCurrentMonth).hour('10').toDate(),
    address: {
      street: '37 rue de Ponthieu',
      zipCode: '75008',
      city: 'Paris',
      fullAddress: '37 rue de Ponthieu 75008 Paris',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    isCancelled: true,
    cancel: { condition: INVOICED_AND_NOT_PAID, reason: CUSTOMER_INITIATIVE },
    misc: 'test',
    startDate: cloneDeep(mondayOfCurrentMonth).hour('13').toDate(),
    endDate: cloneDeep(mondayOfCurrentMonth).hour('14').toDate(),
    address: {
      street: '37 rue de Ponthieu',
      zipCode: '75008',
      city: 'Paris',
      fullAddress: '37 rue de Ponthieu 75008 Paris',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[0]._id,
    sector: new ObjectId(),
    subscription: subscriptionId,
    auxiliary: userList[0]._id,
    isCancelled: true,
    cancel: { condition: INVOICED_AND_PAID, reason: CUSTOMER_INITIATIVE },
    misc: 'test',
    startDate: cloneDeep(tuesdayOfPreviousMonth).hour('10').toDate(),
    endDate: cloneDeep(tuesdayOfPreviousMonth).hour('14').toDate(),
    address: {
      street: '37 rue de Ponthieu',
      zipCode: '75008',
      city: 'Paris',
      fullAddress: '37 rue de Ponthieu 75008 Paris',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    customer: customerList[1]._id,
    sector: new ObjectId(),
    subscription: subscriptionWithEndedFundingId,
    auxiliary: userList[0]._id,
    isCancelled: false,
    misc: 'test',
    startDate: cloneDeep(tuesdayOfCurrentMonth).hour('12').toDate(),
    endDate: cloneDeep(tuesdayOfCurrentMonth).hour('15').toDate(),
    address: {
      street: '37 rue de Ponthieu',
      zipCode: '75008',
      city: 'Paris',
      fullAddress: '37 rue de Ponthieu 75008 Paris',
      location: { type: 'Point', coordinates: [2.0987, 1.2345] },
    },
  },
];

const populateDBWithEventsForFollowup = async () => {
  await Promise.all([
    Event.deleteMany(),
    Event.insertMany(eventListForFollowUp),
  ]);
};

const populateDBWithEventsForFundingsMonitoring = async () => {
  await Promise.all([
    Event.deleteMany(),
    Event.insertMany(eventListForFundingsMonitoring),
  ]);
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    User.create(userList),
    Customer.create(customerList.concat(customerFromOtherCompany)),
    Service.create(serviceList),
    Sector.create(sectorList),
    SectorHistory.create(sectorHistoryList),
    Contract.create(contractList),
    ThirdPartyPayer.create(tppList),
    ReferentHistory.create(referentList),
    UserCompany.create(userCompanyList),
  ]);
};

module.exports = {
  customerList,
  userList,
  sectorList,
  populateDB,
  populateDBWithEventsForFollowup,
  populateDBWithEventsForFundingsMonitoring,
  customerFromOtherCompany,
};
