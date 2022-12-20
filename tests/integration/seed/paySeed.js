const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Contract = require('../../../src/models/Contract');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const Pay = require('../../../src/models/Pay');
const UserCompany = require('../../../src/models/UserCompany');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { WEBAPP, UNPAID_LEAVE, PAID_LEAVE, DAILY, ABSENCE } = require('../../../src/helpers/constants');
const { coachRoleId, auxiliaryRoleId } = require('../../seed/authRolesSeed');

const year = moment().year() + 1;

const contractId0 = new ObjectId();
const contractId1 = new ObjectId();
const auxiliaryId0 = new ObjectId();
const auxiliaryId1 = new ObjectId();
const customerId = new ObjectId();
const subscriptionId = new ObjectId();
const serviceId = new ObjectId();
const sectors = [
  { name: 'Toto', _id: new ObjectId(), company: authCompany._id },
  { name: 'Titi', _id: new ObjectId(), company: authCompany._id },
  { name: 'Tutu', _id: new ObjectId(), company: otherCompany._id },
];
const sectorFromOtherCompany = { _id: new ObjectId(), name: 'Titi', company: otherCompany._id };

const user = {
  _id: new ObjectId(),
  local: { email: 'test4@alenvi.io' },
  identity: { lastname: 'Toto' },
  refreshToken: uuidv4(),
  role: { client: coachRoleId },
  origin: WEBAPP,
};

const auxiliaries = [
  {
    _id: auxiliaryId0,
    identity: { firstname: 'Test7', lastname: 'auxiliary' },
    local: { email: 'test7@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [contractId0],
    origin: WEBAPP,
  },
  {
    _id: auxiliaryId1,
    identity: { firstname: 'OtherTest', lastname: 'Test8' },
    local: { email: 'test8@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [contractId1],
    origin: WEBAPP,
  },
];

const auxiliaryFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'otherCompany', lastname: 'Chloe' },
  local: { email: 'othercompany@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  contracts: [contractId1],
  sector: sectorFromOtherCompany._id,
  origin: WEBAPP,
};

const userCompanyList = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: auxiliaryId0,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: auxiliaryId0, company: authCompany._id },
  { _id: new ObjectId(), user: auxiliaryId1, company: authCompany._id },
  { _id: new ObjectId(), user: auxiliaryFromOtherCompany._id, company: otherCompany._id },
  { _id: new ObjectId(), user: user._id, company: authCompany._id },
];

const contracts = [
  {
    createdAt: '2022-12-04T16:34:04.000Z',
    serialNumber: 'sdfgdgfdgvc',
    user: auxiliaryId0,
    startDate: '2022-12-10T08:00:00.000Z',
    _id: contractId0,
    company: authCompany._id,
    versions: [
      {
        createdAt: '2022-12-04T16:34:04.000Z',
        endDate: null,
        grossHourlyRate: 10.28,
        startDate: '2022-12-10T08:00:00.000Z',
        weeklyHours: 35,
        _id: new ObjectId(),
      },
    ],
  },
  {
    createdAt: '2022-12-04T16:34:04.000Z',
    user: auxiliaryId1,
    serialNumber: 'dskfajdsfcbnnsdal',
    company: authCompany._id,
    startDate: '2022-12-03T23:00:00.000Z',
    _id: contractId1,
    endDate: '2023-11-03T23:00:00',
    endNotificationDate: '2022-03-03T23:00:00.000Z',
    endReason: 'resignation',
    versions: [
      {
        createdAt: '2022-12-04T16:34:04.000Z',
        endDate: '2022-03-03T23:00:00.000Z',
        grossHourlyRate: 10.28,
        startDate: '2022-12-03T23:00:00.000Z',
        weeklyHours: 7,
        _id: new ObjectId(),
      },
      {
        createdAt: '2022-12-04T16:34:04.000Z',
        endDate: '2023-10-01T23:00:00.000Z',
        grossHourlyRate: 10.28,
        startDate: '2022-12-03T23:00:00.000Z',
        weeklyHours: 7,
        _id: new ObjectId(),
      },
      {
        createdAt: '2022-12-04T16:34:04.000Z',
        endDate: '2023-11-03T23:00:00.000Z',
        grossHourlyRate: 10.28,
        startDate: '2023-10-01T23:00:01.000Z',
        weeklyHours: 7,
        _id: new ObjectId(),
      },
    ],
  },
];

const event = {
  _id: new ObjectId(),
  company: authCompany._id,
  type: 'intervention',
  startDate: '2022-05-12T09:00:00.000Z',
  endDate: '2022-05-12T11:00:00.000Z',
  auxiliary: auxiliaries[0],
  customer: customerId,
  createdAt: '2022-05-01T09:00:00.000Z',
  sector: new ObjectId(),
  subscription: subscriptionId,
  address: {
    fullAddress: '37 rue de ponthieu 75008 Paris',
    zipCode: '75008',
    city: 'Paris',
    street: '37 rue de Ponthieu',
    location: { type: 'Point', coordinates: [2.377133, 48.801389] },
  },
};

const absences = [
  {
    _id: new ObjectId(),
    type: ABSENCE,
    company: authCompany._id,
    auxiliary: auxiliaryId0,
    absence: UNPAID_LEAVE,
    absenceNature: DAILY,
    startDate: `${year}-11-12T09:00:00.000Z`,
    endDate: `${year}-11-16T21:29:29.000Z`,
  },
  {
    _id: new ObjectId(),
    type: ABSENCE,
    company: authCompany._id,
    auxiliary: auxiliaryId0,
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2022-12-12T00:00:00.000Z',
    endDate: '2022-12-15T21:59:00.000Z',
  },
];

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
  subscriptions: [
    {
      _id: subscriptionId,
      service: serviceId,
      versions: [{
        unitTTCRate: 12,
        weeklyHours: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2022-01-01T10:00:00.000+01:00',
      }],
    },
  ],
};

const service = {
  _id: serviceId,
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    exemptFromCharges: false,
    startDate: '2022-01-16 17:58:15.000Z',
    vat: 12,
  }],
  nature: 'hourly',
};

const sectorHistories = [
  {
    auxiliary: auxiliaryId0,
    sector: sectors[0]._id,
    company: authCompany._id,
    startDate: '2022-12-01T00:00:00.000Z',
    endDate: '2023-12-11T23:59:59.999Z',
  },
  {
    auxiliary: auxiliaryId0,
    sector: sectors[1]._id,
    company: authCompany._id,
    startDate: '2023-12-12T00:00:00.000Z',
  },
  {
    auxiliary: auxiliaryId1,
    sector: sectors[1]._id,
    company: authCompany._id,
    startDate: '2022-12-10T00:00:00.000Z',
    endDate: '2023-05-10T23:59:59.999Z',
  },
  {
    auxiliary: auxiliaryId1,
    sector: sectors[0]._id,
    company: authCompany._id,
    startDate: '2022-05-11T00:00:00.000Z',
    endDate: '2023-11-03T23:59:59.999Z',
  },
];

const payList = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    additionalHours: 0,
    auxiliary: auxiliaries[0]._id,
    bonus: 0,
    contractHours: 151,
    diff: {
      hoursBalance: 8,
      notSurchargedAndNotExempt: 2,
      notSurchargedAndExempt: 2,
      surchargedAndExempt: 2,
      surchargedAndExemptDetails: [],
      surchargedAndNotExempt: 2,
      surchargedAndNotExemptDetails: [],
      workedHours: 0,
      paidTransportHours: 3,
      internalHours: 9,
      absencesHours: 5,
    },
    endDate: `${year}-11-30T14:00:18.000Z`,
    hoursBalance: -8,
    hoursCounter: -20,
    hoursToWork: 30,
    holidaysHours: 12,
    notSurchargedAndExempt: 97,
    notSurchargedAndNotExempt: 43,
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    month: `11-${year}`,
    mutual: false,
    phoneFees: 0,
    overtimeHours: 0,
    startDate: `${year}-11-01T14:00:18.000Z`,
    transport: 10,
    workedHours: 143,
    paidTransportHours: 3,
    paidKm: 12,
    travelledKm: 14,
    internalHours: 9,
    absencesHours: 5,
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    additionalHours: 0,
    auxiliary: auxiliaries[0]._id,
    bonus: 0,
    contractHours: 151,
    diff: {
      hoursBalance: 8,
      notSurchargedAndNotExempt: 2,
      notSurchargedAndExempt: 2,
      surchargedAndExempt: 2,
      surchargedAndExemptDetails: [],
      surchargedAndNotExempt: 2,
      surchargedAndNotExemptDetails: [],
      workedHours: 0,
      paidTransportHours: 3,
      internalHours: 9,
      absencesHours: 5,
    },
    endDate: `${year}-11-28T14:00:18.000Z`,
    holidaysHours: 12,
    hoursBalance: -8,
    hoursCounter: -20,
    hoursToWork: 20,
    month: `11-${year}`,
    mutual: false,
    notSurchargedAndExempt: 97,
    notSurchargedAndNotExempt: 43,
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    phoneFees: 0,
    overtimeHours: 0,
    startDate: `${year}-11-01T14:00:18.000Z`,
    transport: 10,
    workedHours: 143,
    paidTransportHours: 3,
    paidKm: 12,
    travelledKm: 14,
    internalHours: 9,
    absencesHours: 5,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Sector.create([...sectors, sectorFromOtherCompany]),
    SectorHistory.create(sectorHistories),
    User.create([user, ...auxiliaries, auxiliaryFromOtherCompany]),
    Customer.create(customer),
    Service.create(service),
    Event.create([event, ...absences]),
    Contract.create(contracts),
    Pay.create(payList),
    UserCompany.create(userCompanyList),
  ]);
};

module.exports = {
  populateDB,
  auxiliaries,
  auxiliaryFromOtherCompany,
  sectors,
  sectorFromOtherCompany,
};
