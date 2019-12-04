const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const moment = require('moment');
const { COMPANY_CONTRACT, HOURLY, DAILY, PAID_LEAVE } = require('../../../src/helpers/constants');
const Bill = require('../../../src/models/Bill');
const Service = require('../../../src/models/Service');
const Customer = require('../../../src/models/Customer');
const Company = require('../../../src/models/Company');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const BillNumber = require('../../../src/models/BillNumber');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const { populateDBForAuthentication, rolesList, authCompany } = require('./authenticationSeed');

const billThirdPartyPayer = {
  _id: new ObjectID(),
  name: 'Toto',
  company: authCompany._id,
};

const company = {
  _id: new ObjectID('5d3eb871dd552f11866eea7b'),
  name: 'Test',
  tradeName: 'To',
  rhConfig: {
    internalHours: [
      { name: 'Formation', default: true, _id: new ObjectID() },
      { name: 'Code', default: false, _id: new ObjectID() },
      { name: 'Gouter', default: false, _id: new ObjectID() },
    ],
    feeAmount: 12,
  },
  customersConfig: {
    billingPeriod: 'two_weeks',
  },
  iban: 'FR3514508000505917721779B12',
  bic: 'RTYUIKJHBFRG',
  ics: '12345678',
  directDebitsFolderId: '1234567890',
};

const billServices = [{
  _id: new ObjectID(),
  type: COMPANY_CONTRACT,
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    startDate: '2019-01-16 17:58:15.519',
    vat: 12,
    exemptFromCharges: false,
  }],
  nature: HOURLY,
}, {
  _id: new ObjectID(),
  type: COMPANY_CONTRACT,
  company: company._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 2',
    startDate: '2019-01-16 17:58:15.519',
    vat: 12,
    exemptFromCharges: false,
  }],
  nature: HOURLY,
}];

const authBillService = {
  serviceId: new ObjectID(),
  name: 'Temps de qualité - autonomie',
  nature: 'fixed',
};

const billCustomerList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    email: 'tito@ty.com',
    identity: {
      title: 'mr',
      firstname: 'Egan',
      lastname: 'Bernal',
    },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
      },
      phone: '0612345678',
    },
    payment: {
      bankAccountOwner: 'Lance Amstrong',
      iban: 'FR3514508000505917721779B12',
      bic: 'BNMDHISOBD',
      mandates: [
        { rum: 'R09876543456765432', _id: new ObjectID(), signedAt: moment().toDate() },
      ],
    },
    subscriptions: [
      {
        _id: new ObjectID(),
        service: billServices[0]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          startDate: '2018-01-01T10:00:00.000+01:00',
        }],
      },
    ],
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
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
      },
      phone: '0612345678',
    },
    subscriptions: [
      {
        _id: new ObjectID(),
        service: billServices[0]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          startDate: '2018-01-01T10:00:00.000+01:00',
        }],
      },
    ],
    payment: {
      bankAccountOwner: 'David gaudu',
      iban: '',
      bic: '',
      mandates: [
        { rum: 'R012345678903456789', _id: new ObjectID() },
      ],
    },
  },
  {
    _id: new ObjectID(),
    company: company._id,
    email: 'r.alagna@test.com',
    identity: {
      title: 'mr',
      firstname: 'Roberto',
      lastname: 'Alagna',
    },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
      },
      phone: '0612345678',
    },
    subscriptions: [
      {
        _id: new ObjectID(),
        service: billServices[1]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          startDate: '2018-01-01T10:00:00.000+01:00',
        }],
      },
    ],
    payment: {
      bankAccountOwner: 'Roberto Alagna',
      iban: '',
      bic: '',
      mandates: [
        { rum: 'R014345658903456780', _id: new ObjectID() },
      ],
    },
  },
];

const billUserList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'HelperForCustomer', lastname: 'Test' },
    local: { email: 'helper_for_customer_bill@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'helper')._id,
    customers: [billCustomerList[0]._id],
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Tata', lastname: 'Toto' },
    local: { email: 'toto@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'auxiliary')._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Titi', lastname: 'Toto' },
    local: { email: 'titi@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'helper')._id,
    customers: [billCustomerList[2]._id],
    company: company._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Tutu', lastname: 'Toto' },
    local: { email: 'tutu@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'auxiliary')._id,
    company: company._id,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Tyty', lastname: 'Toto' },
    local: { email: 'tyty@alenvi.io', password: '123456' },
    refreshToken: uuidv4(),
    role: rolesList.find(role => role.name === 'coach')._id,
    company: company._id,
  },
];

const authBillsList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'FACT-1807001',
    date: '2019-05-29',
    customer: billCustomerList[0]._id,
    client: billThirdPartyPayer._id,
    netInclTaxes: 75.96,
    subscriptions: [{
      startDate: '2019-05-29',
      endDate: '2019-11-29',
      subscription: billCustomerList[0].subscriptions[0]._id,
      service: authBillService,
      vat: 5.5,
      events: [{
        eventId: new ObjectID(),
        startDate: '2019-01-16T09:30:19.543Z',
        endDate: '2019-01-16T11:30:21.653Z',
        auxiliary: billUserList[1]._id,
      }],
      hours: 8,
      unitExclTaxes: 9,
      unitInclTaxes: 9.495,
      exclTaxes: 72,
      inclTaxes: 75.96,
      discount: 0,
    }],
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'FACT-1807002',
    date: '2019-05-25',
    customer: billCustomerList[1]._id,
    netInclTaxes: 101.28,
    subscriptions: [{
      startDate: '2019-05-25',
      endDate: '2019-11-25',
      subscription: billCustomerList[1].subscriptions[0]._id,
      vat: 5.5,
      events: [{
        eventId: new ObjectID(),
        startDate: '2019-01-16T10:30:19.543Z',
        endDate: '2019-01-16T12:30:21.653Z',
        auxiliary: billUserList[1]._id,
      }],
      service: authBillService,
      hours: 4,
      unitExclTaxes: 24,
      unitInclTaxes: 25.32,
      exclTaxes: 96,
      inclTaxes: 101.28,
      discount: 0,
    }],
  },
];

const billsList = [
  {
    _id: new ObjectID(),
    company: company._id,
    number: 'FACT-1807003',
    date: '2019-05-29',
    customer: billCustomerList[2]._id,
    netInclTaxes: 75.96,
    subscriptions: [{
      startDate: '2019-05-29',
      endDate: '2019-11-29',
      subscription: billCustomerList[2].subscriptions[0]._id,
      service: authBillService,
      vat: 5.5,
      events: [{
        eventId: new ObjectID(),
        startDate: '2019-01-16T09:30:19.543Z',
        endDate: '2019-01-16T11:30:21.653Z',
        auxiliary: billUserList[3]._id,
      }],
      hours: 8,
      unitExclTaxes: 9,
      unitInclTaxes: 9.495,
      exclTaxes: 72,
      inclTaxes: 75.96,
      discount: 0,
    }],
  },
];

const eventList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'internalHour',
    startDate: '2019-01-17T10:30:18.653Z',
    endDate: '2019-01-17T12:00:18.653Z',
    auxiliary: new ObjectID(),
    customer: billCustomerList[0]._id,
    createdAt: '2019-01-05T15:24:18.653Z',
    internalHour: {
      _id: new ObjectID(),
      name: 'Formation',
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'absence',
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: new ObjectID(),
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary: new ObjectID(),
    customer: billCustomerList[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: billCustomerList[0].subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary: new ObjectID(),
    customer: billCustomerList[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: billCustomerList[0].subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-18T14:30:19.543Z',
    endDate: '2019-01-18T16:30:19.543Z',
    auxiliary: new ObjectID(),
    customer: billCustomerList[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: billCustomerList[0].subscriptions[0]._id,
  },
];

const populateDB = async () => {
  await Service.deleteMany({});
  await Company.deleteMany({});
  await Customer.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await Bill.deleteMany({});
  await Event.deleteMany({});
  await BillNumber.deleteMany({});
  await User.deleteMany({});

  await populateDBForAuthentication();
  await (new Company(company)).save();
  await (new ThirdPartyPayer(billThirdPartyPayer)).save();
  await Service.insertMany(billServices);
  await Customer.insertMany(billCustomerList);
  await Bill.insertMany([...authBillsList, ...billsList]);
  await Event.insertMany(eventList);
  await User.create(billUserList);
};

module.exports = {
  authBillsList,
  populateDB,
  billCustomerList,
  billUserList,
  billsList,
  billServices,
  eventList,
  billThirdPartyPayer,
};
