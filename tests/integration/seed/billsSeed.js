const { ObjectID } = require('mongodb');
const moment = require('moment');
const { COMPANY_CONTRACT, HOURLY } = require('../../../helpers/constants');
const Bill = require('../../../models/Bill');
const Service = require('../../../models/Service');
const Customer = require('../../../models/Customer');
const Company = require('../../../models/Company');
const ThirdPartyPayer = require('../../../models/ThirdPartyPayer');
const BillNumber = require('../../../models/BillNumber');
const Event = require('../../../models/Event');
const { populateDBForAuthentification } = require('./authentificationSeed');

const billThirdPartyPayer = {
  _id: new ObjectID(),
  name: 'Toto',
};

const company = {
  _id: new ObjectID('5d3eb871dd552f11866eea7b'),
  name: 'Test',
  rhConfig: {
    internalHours: [
      { name: 'Formation', default: true, _id: new ObjectID() },
      { name: 'Code', default: false, _id: new ObjectID() },
      { name: 'Gouter', default: false, _id: new ObjectID() },
    ],
    feeAmount: 12,
  },
  iban: 'FR3514508000505917721779B12',
  bic: 'RTYUIKJHBFRG',
  ics: '12345678',
  directDebitsFolderId: '1234567890',
};

const billService = {
  _id: new ObjectID(),
  type: COMPANY_CONTRACT,
  company: company._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    startDate: '2019-01-16 17:58:15.519',
    vat: 12,
  }],
  nature: HOURLY,
};

const billCustomerList = [
  {
    _id: new ObjectID(),
    email: 'tito@ty.com',
    identity: {
      title: 'M',
      firstname: 'Egan',
      lastname: 'Bernal',
    },
    contact: {
      address: {
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
        service: billService._id,
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
    email: 'fake@test.com',
    identity: {
      title: 'M',
      firstname: 'Romain',
      lastname: 'Bardet',
    },
    subscriptions: [
      {
        _id: new ObjectID(),
        service: billService._id,
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
];

const billsList = [
  {
    _id: new ObjectID(),
    number: 'FACT-1807001',
    date: '2019-05-29',
    customer: billCustomerList[0]._id,
    client: billThirdPartyPayer._id,
    netInclTaxes: 75.96,
    subscriptions: [{
      startDate: '2019-05-29',
      endDate: '2019-11-29',
      subscription: billCustomerList[0].subscriptions[0]._id,
      vat: 5.5,
      service: { name: 'Temps de qualité - autonomie' },
      events: [{
        eventId: new ObjectID(),
        startDate: '2019-01-16T09:30:19.543Z',
        endDate: '2019-01-16T11:30:21.653Z',
        auxiliary: new ObjectID(),
      }],
      hours: 8,
      unitExclTaxes: 9,
      exclTaxes: 72,
      inclTaxes: 75.96,
      discount: 0,
    }],
  },
  {
    _id: new ObjectID(),
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
        auxiliary: new ObjectID(),
      }],
      service: { name: 'Temps de qualité - autonomie' },
      hours: 4,
      unitExclTaxes: 24,
      exclTaxes: 96,
      inclTaxes: 101.28,
      discount: 0,
    }],
  },
];

const eventList = [
  {
    _id: new ObjectID(),
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
    sector: new ObjectID(),
    type: 'absence',
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary: new ObjectID(),
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
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
];

const populateDB = async () => {
  await Service.deleteMany({});
  await Company.deleteMany({});
  await Customer.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await Bill.deleteMany({});
  await Event.deleteMany({});
  await BillNumber.deleteMany({});

  await populateDBForAuthentification();
  await (new Company(company)).save();
  await (new ThirdPartyPayer(billThirdPartyPayer)).save();
  await new Service(billService).save();
  await Customer.insertMany(billCustomerList);
  await Bill.insertMany(billsList);
  await Event.insertMany(eventList);
};

module.exports = {
  billsList,
  populateDB,
  billCustomerList,
};
