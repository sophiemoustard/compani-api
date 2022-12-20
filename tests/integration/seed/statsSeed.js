const { ObjectId } = require('mongodb');
const cloneDeep = require('lodash/cloneDeep');
const { v4: uuidv4 } = require('uuid');
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
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
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
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');
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
  startDate: '2010-09-03T00:00:00.000Z',
  versions: [{ startDate: '2010-09-03T00:00:00.000Z', grossHourlyRate: 10.43, weeklyHours: 12 }],
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
    inactivityDate: '2019-01-01T23:59:59.000Z',
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary', lastname: 'Red' },
    local: { email: 'blue@alenvi.io' },
    role: { client: auxiliaryRoleId },
    inactivityDate: '2019-01-01T23:59:59.000Z',
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
];

const userCompanyList = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: userList[0],
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: userList[0], company: authCompany._id },
  { _id: new ObjectId(), user: userList[1], company: authCompany._id },
  { _id: new ObjectId(), user: userList[2], company: otherCompany._id },
];

const sectorHistoryList = [
  {
    auxiliary: userList[0]._id,
    sector: sectorList[0]._id,
    company: authCompany._id,
    startDate: '2019-05-12T23:00:00.000Z',
    endDate: '2019-11-10T22:59:00.000Z',
  },
  {
    auxiliary: userList[0]._id,
    sector: sectorList[1]._id,
    company: authCompany._id,
    startDate: '2019-11-11T23:00:00.000Z',
  },
  {
    auxiliary: userList[1]._id,
    sector: sectorList[0]._id,
    company: authCompany._id,
    startDate: '2019-05-12T23:00:00.000Z',
    endDate: '2020-02-12T22:59:00.000Z',
  },
  {
    auxiliary: userList[1]._id,
    sector: sectorList[1]._id,
    company: authCompany._id,
    startDate: '2020-02-12T23:00:00.000Z',
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
        startDate: '2019-01-16 17:58:15.000Z',
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
            startDate: CompaniDate().startOf('month').oldSubtract({ months: 2 }).toDate(),
            createdAt: CompaniDate().startOf('month').oldSubtract({ months: 2 }).toDate(),
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
            startDate: CompaniDate().startOf('month').oldSubtract({ months: 2 }).toDate(),
            createdAt: CompaniDate().startOf('month').oldSubtract({ months: 2 }).toDate(),
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
            startDate: CompaniDate().startOf('month').oldSubtract({ months: 2 }).toDate(),
            createdAt: CompaniDate().startOf('month').oldSubtract({ months: 2 }).toDate(),
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
            startDate: '2019-07-01T08:00:00.000Z',
            endDate: '2019-07-01T10:00:00.000Z',
            createdAt: CompaniDate().startOf('month').oldSubtract({ months: 2 }).toDate(),
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
    startDate: '2019-03-12T00:00:00.000Z',
    endDate: '2020-01-10T00:00:00.000Z',
  },
  {
    auxiliary: userList[1]._id,
    customer: customerList[0]._id,
    company: customerList[0].company,
    startDate: '2020-01-11T00:00:00.000Z',
    endDate: CompaniDate().oldAdd({ days: 1 }).toDate(),
  },
  {
    auxiliary: userList[2]._id,
    customer: customerList[0]._id,
    company: customerList[0].company,
    startDate: CompaniDate().oldAdd({ days: 2 }).toDate(),
  },
  {
    auxiliary: userList[0]._id,
    customer: customerList[1]._id,
    company: customerList[1].company,
    startDate: '2018-03-12T00:00:00.000Z',
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
    startDate: '2019-07-01T08:00:00.000Z',
    endDate: '2019-07-01T09:00:00.000Z',
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
    startDate: '2019-07-01T10:00:00.000Z',
    endDate: '2019-07-01T11:00:00.000Z',
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
    startDate: '2019-07-02T09:00:00.000Z',
    endDate: '2019-07-02T10:30:00.000Z',
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
    startDate: '2019-07-02T09:00:00.000Z',
    endDate: '2019-07-02T10:30:00.000Z',
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
    startDate: '2019-11-09T09:00:00.000Z',
    endDate: '2019-11-09T10:30:00.000Z',
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
    startDate: '2019-11-13T09:00:00.000Z',
    endDate: '2019-11-13T11:30:00.000Z',
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
    startDate: '2019-11-13T09:00:00.000Z',
    endDate: '2019-11-13T11:30:00.000Z',
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
    startDate: '2020-01-04T09:00:00.000Z',
    endDate: '2020-01-04T11:30:00.000Z',
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
    startDate: '2020-01-13T09:00:00.000Z',
    endDate: '2020-01-13T10:30:00.000Z',
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
    startDate: '2019-07-12T09:00:00.000Z',
    endDate: '2019-07-12T10:00:00.000Z',
    internalHour: internalHoursList[0]._id,
    auxiliary: userList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectId(),
    type: INTERNAL_HOUR,
    startDate: '2019-11-02T09:00:00.000Z',
    endDate: '2019-11-02T11:00:00.000Z',
    internalHour: internalHoursList[0]._id,
    auxiliary: userList[0]._id,
    company: authCompany._id,
  },
];

const dayOfCurrentMonth = (day) => {
  const startOfMonth = CompaniDate().startOf('month');

  if (!startOfMonth.oldAdd({ days: 7 }).set({ weekDay: day }).startOf('day').isHoliday()) {
    return startOfMonth.oldAdd({ days: 7 }).set({ weekDay: day });
  }
  if (!startOfMonth.oldAdd({ days: 14 }).set({ weekDay: day }).startOf('day').isHoliday()) {
    return startOfMonth.oldAdd({ days: 14 }).set({ weekDay: day });
  }
  return startOfMonth.oldAdd({ days: 21 }).set({ weekDay: day });
};

const mondayOfCurrentMonth = dayOfCurrentMonth(1);
const tuesdayOfCurrentMonth = dayOfCurrentMonth(2);
const sundayOfCurrentMonth = dayOfCurrentMonth(0);

const dayOfPreviousMonth = (day) => {
  const startOfMonth = CompaniDate().oldSubtract({ months: 1 }).startOf('month');

  if (!startOfMonth.oldAdd({ days: 7 }).set({ weekDay: day }).startOf('day').isHoliday()) {
    return startOfMonth.oldAdd({ days: 7 }).set({ weekDay: day });
  }
  if (!startOfMonth.oldAdd({ days: 14 }).set({ weekDay: day }).startOf('day').isHoliday()) {
    return startOfMonth.oldAdd({ days: 14 }).set({ weekDay: day });
  }
  return startOfMonth.oldAdd({ days: 21 }).set({ weekDay: day });
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
    startDate: cloneDeep(mondayOfCurrentMonth).set({ hours: '12' }).toDate(),
    endDate: cloneDeep(mondayOfCurrentMonth).set({ hours: '14' }).toDate(),
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
    startDate: cloneDeep(tuesdayOfCurrentMonth).set({ hours: 12 }).toDate(),
    endDate: cloneDeep(tuesdayOfCurrentMonth).set({ hours: 15 }).toDate(),
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
    startDate: cloneDeep(sundayOfCurrentMonth).set({ hours: 8 }).toDate(),
    endDate: cloneDeep(sundayOfCurrentMonth).set({ hours: 10 }).toDate(),
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
    startDate: cloneDeep(mondayOfCurrentMonth).set({ hours: 13 }).toDate(),
    endDate: cloneDeep(mondayOfCurrentMonth).set({ hours: 14 }).toDate(),
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
    startDate: cloneDeep(tuesdayOfPreviousMonth).set({ hours: 10 }).toDate(),
    endDate: cloneDeep(tuesdayOfPreviousMonth).set({ hours: 14 }).toDate(),
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
    startDate: cloneDeep(tuesdayOfCurrentMonth).set({ hours: 12 }).toDate(),
    endDate: cloneDeep(tuesdayOfCurrentMonth).set({ hours: 15 }).toDate(),
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
  await Promise.all([Event.create(eventListForFollowUp)]);
};

const populateDBWithEventsForFundingsMonitoring = async () => {
  await Promise.all([Event.create(eventListForFundingsMonitoring)]);
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
