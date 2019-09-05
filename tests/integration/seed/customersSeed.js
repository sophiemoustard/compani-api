const { ObjectID } = require('mongodb');
const moment = require('moment');
const Customer = require('../../../models/Customer');
const Company = require('../../../models/Company');
const Service = require('../../../models/Service');
const Event = require('../../../models/Event');
const QuoteNumber = require('../../../models/QuoteNumber');
const ThirdPartyPayer = require('../../../models/ThirdPartyPayer');
const { FIXED, ONCE, COMPANY_CONTRACT, HOURLY, CUSTOMER_CONTRACT } = require('../../../helpers/constants');
const { populateDBForAuthentification } = require('./authentificationSeed');

const subId = new ObjectID();

const customerCompany = {
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

const customerServiceList = [
  {
    _id: new ObjectID(),
    type: COMPANY_CONTRACT,
    company: customerCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 1',
      startDate: '2019-01-16 17:58:15',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: new ObjectID(),
    type: CUSTOMER_CONTRACT,
    company: customerCompany._id,
    versions: [{
      defaultUnitAmount: 24,
      name: 'Service 2',
      startDate: '2019-01-18 19:58:15',
      vat: 12,
    }],
    nature: HOURLY,
  },
];

const customerThirdPartyPayer = {
  _id: new ObjectID('62400565f8fd3555379720c9'),
};

const customersList = [
  { // Customer with subscriptions, subscriptionsHistory, fundings and quote
    _id: new ObjectID(),
    email: 'fake@test.com',
    identity: {
      title: 'M',
      firstname: 'Romain',
      lastname: 'Bardet',
    },
    contact: {
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
      },
      phone: '0123456789',
      accessCodes: 'porte c3po',
    },
    followUp: {
      environment: 'ne va pas bien',
      objectives: 'preparer le dejeuner + balade',
      misc: 'code porte: 1234',
    },
    subscriptions: [
      {
        _id: subId,
        service: customerServiceList[0]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
        }],
      },
      {
        _id: new ObjectID(),
        service: customerServiceList[1]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
        }],
      },
    ],
    subscriptionsHistory: [{
      subscriptions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        service: 'Service 1',
      }, {
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        service: 'Service 2',
      }],
      helper: {
        firstname: 'Vladimir',
        lastname: 'Poutine',
        title: 'M',
      },
      approvalDate: '2018-01-01T10:00:00.000+01:00',
    }],
    payment: {
      bankAccountOwner: 'David gaudu',
      iban: '',
      bic: '',
      mandates: [
        { rum: 'R012345678903456789' },
      ],
    },
    quotes: [{
      _id: new ObjectID(),
      subscriptions: [{
        serviceName: 'Test',
        unitTTCRate: 23,
        estimatedWeeklyVolume: 3,
      }, {
        serviceName: 'Test2',
        unitTTCRate: 30,
        estimatedWeeklyVolume: 10,
      }],
    }],
    fundings: [
      {
        _id: new ObjectID(),
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayer._id,
        subscription: subId,
        versions: [{
          folderNumber: 'D123456',
          startDate: moment.utc().toDate(),
          frequency: ONCE,
          endDate: moment.utc().add(6, 'months').toDate(),
          effectiveDate: moment.utc().toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [0, 1, 2, 3, 4, 5, 6],
        }],
      },
    ],
  },
  { // Customer with mandates
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
      accessCodes: 'you shall not pass',
    },
    payment: {
      bankAccountOwner: 'Lance Amstrong',
      iban: 'FR3514508000505917721779B12',
      bic: 'BNMDHISOBD',
      mandates: [
        { rum: 'R09876543456765432', _id: new ObjectID(), signedAt: moment().toDate() },
      ],
    },
  },
  {
    _id: new ObjectID(),
    email: 'toototjo@hfjld.io',
    identity: {
      title: 'M',
      firstname: 'Julian',
      lastname: 'Alaphilippe',
    },
    contact: {
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
      },
      phone: '0612345678',
      accessCodes: 'Bouton a l\'entrée',
    },
    payment: {
      bankAccountOwner: 'David gaudu',
      iban: '',
      bic: '',
      mandates: [
        { rum: 'R012345678903456789' },
      ],
    },
  },
  {
    _id: new ObjectID('5d7101633a0366169cf3bc1c'),
    email: 'volgarr@theviking.io',
    identity: {
      title: 'M',
      firstname: 'Volgarr',
      lastname: 'Theviking',
    },
    contact: {
      address: {
        fullAddress: 'Lyngsøvej 26, 8600 Silkeborg, Danemark',
        zipCode: '8600',
        city: 'Silkeborg',
      },
      phone: '0612345678',
    },
  },
];

const eventList = [
  {
    _id: new ObjectID(),
    isBilled: true,
    customer: customersList[0]._id,
    type: 'intervention',
    bills: {},
    subscription: subId,
  },
  {
    _id: new ObjectID(),
    sector: new ObjectID(),
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    customer: customersList[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: subId,
    isBilled: true,
    bills: {
      thirdPartyPayer: customerThirdPartyPayer._id,
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
      inclTaxesTpp: 10,
      exclTaxesTpp: 5,
      fundingId: new ObjectID(),
      nature: 'hourly',
      careHours: 2,
    },
  },
];

const populateDB = async () => {
  await Service.deleteMany({});
  await Company.deleteMany({});
  await Customer.deleteMany({});
  await Event.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await QuoteNumber.deleteMany({});

  await populateDBForAuthentification();
  await (new Company(customerCompany)).save();
  await (new ThirdPartyPayer(customerThirdPartyPayer)).save();
  await Service.insertMany(customerServiceList);
  await Customer.insertMany(customersList);
  await Event.insertMany(eventList);
};

module.exports = {
  customersList,
  populateDB,
  customerServiceList,
  customerThirdPartyPayer,
};
