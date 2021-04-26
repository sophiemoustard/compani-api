const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const QuoteNumber = require('../../../src/models/QuoteNumber');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const User = require('../../../src/models/User');
const Bill = require('../../../src/models/Bill');
const Payment = require('../../../src/models/Payment');
const CreditNote = require('../../../src/models/CreditNote');
const TaxCertificate = require('../../../src/models/TaxCertificate');
const Helper = require('../../../src/models/Helper');
const {
  FIXED,
  ONCE,
  HOURLY,
  AUXILIARY,
  WEBAPP,
} = require('../../../src/helpers/constants');
const { populateDBForAuthentication, rolesList, authCompany, otherCompany } = require('./authenticationSeed');

const subId = new ObjectID();
const subId2 = new ObjectID();
const subId3 = new ObjectID();
const otherCompanyCustomerId = new ObjectID();

const referentList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Referent', lastname: 'Test', title: 'mr' },
    local: { email: 'auxiliaryreferent@alenvi.io', password: '123456!eR' },
    contact: { phone: '0987654321' },
    picture: { publicId: '1234', link: 'test' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === AUXILIARY)._id },
    company: authCompany._id,
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'SuperReferent', lastname: 'Test', title: 'mr' },
    local: { email: 'auxiliaryreferent2@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === AUXILIARY)._id },
    company: authCompany._id,
    origin: WEBAPP,
  },
];

const customerServiceList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 1',
      startDate: '2019-01-16 17:58:15',
      vat: 12,
      exemptFromCharges: false,
    }],
    nature: HOURLY,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 24,
      exemptFromCharges: false,
      name: 'Service 2',
      startDate: '2019-01-18 19:58:15',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      exemptFromCharges: false,
      name: 'Service archivé',
      startDate: '2019-01-18 19:58:15',
      vat: 1,
    }],
    nature: HOURLY,
    isArchived: true,
  },
];

const customerThirdPartyPayer = {
  _id: new ObjectID(),
  company: authCompany._id,
  isApa: true,
};

const customersList = [
  { // Customer with subscriptions, subscriptionsHistory, fundings and quote
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Romain', lastname: 'Bardet' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      secondaryAddress: {
        fullAddress: '27 rue des renaudes 75017 Paris',
        zipCode: '75017',
        city: 'Paris',
        street: '27 rue des renaudes',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0123456789',
      accessCodes: 'porte c3po',
      others: 'autre telephone: 0987654321',
    },
    followUp: {
      environment: 'ne va pas bien',
      objectives: 'preparer le dejeuner + balade',
      misc: 'code porte: 1234',
      situation: 'home',
    },
    subscriptions: [
      {
        _id: subId,
        service: customerServiceList[0]._id,
        versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
      },
      {
        _id: subId3,
        service: customerServiceList[1]._id,
        versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
      },
    ],
    subscriptionsHistory: [{
      subscriptions: [
        {
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          service: 'Service 1',
          subscriptionId: subId,
        },
        {
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          service: 'Service 2',
          subscriptionId: subId3,
        },
      ],
      helper: { firstname: 'Vladimir', lastname: 'Poutine', title: 'mr' },
      approvalDate: '2018-01-01T10:00:00.000+01:00',
    }],
    payment: { bankAccountOwner: 'David gaudu', mandates: [{ rum: 'R012345678903456789' }] },
    quotes: [{
      _id: new ObjectID(),
      subscriptions: [
        { serviceName: 'Test', unitTTCRate: 23, estimatedWeeklyVolume: 3 },
        { serviceName: 'Test2', unitTTCRate: 30, estimatedWeeklyVolume: 10 },
      ],
    }],
    fundings: [{
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
    }],
  },
  { // Customer with mandates
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Egan', lastname: 'Bernal' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
      accessCodes: 'you shall not pass',
    },
    payment: {
      bankAccountOwner: 'Lance Amstrong',
      iban: 'FR3514508000505917721779B12',
      bic: 'BNMDHISOBD',
      mandates: [{ rum: 'R09876543456765432', _id: new ObjectID(), signedAt: moment().toDate() }],
    },
    subscriptions: [{
      _id: new ObjectID(),
      service: customerServiceList[2]._id,
      versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
    }],
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Julian', lastname: 'Alaphilippe' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
      accessCodes: 'Bouton a l\'entrée',
    },
    payment: { bankAccountOwner: 'David gaudu', mandates: [{ rum: 'R012345678903456789' }] },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Volgarr', lastname: 'Theviking' },
    driveFolder: { driveId: '1234567890' },
    contact: {
      primaryAddress: {
        fullAddress: 'Lyngsøvej 26, 8600 Silkeborg, Danemark',
        zipCode: '8600',
        city: 'Silkeborg',
        street: 'Lyngsøvej 26',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
    },
  },
  // customer with bill
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withBills', lastname: 'customer' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectID(),
      service: customerServiceList[0]._id,
      versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
    }],
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
    },
  },
  // customer with payment
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withPayments', lastname: 'customer' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectID(),
      service: customerServiceList[0]._id,
      versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
    }],
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
    },
  },
  // customer with creditNote
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withCreditNote', lastname: 'customer' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectID(),
      service: customerServiceList[0]._id,
      versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
    }],
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
    },
  },
  // customer with taxcertificate
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withBills', lastname: 'customer' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectID(),
      service: customerServiceList[0]._id,
      versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
    }],
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
    },
  },
  { // Helper's customer
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Romain', lastname: 'Bardet' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      secondaryAddress: {
        fullAddress: '27 rue des renaudes 75017 Paris',
        zipCode: '75017',
        city: 'Paris',
        street: '27 rue des renaudes',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0123456789',
      accessCodes: 'porte c3po',
    },
    followUp: { environment: 'ne va pas bien', objectives: 'preparer le dejeuner + balade', misc: 'code porte: 1234' },
    subscriptions: [{
      _id: subId2,
      service: customerServiceList[0]._id,
      versions: [
        { unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1, createdAt: '2020-01-01T23:00:00' },
        { unitTTCRate: 10, estimatedWeeklyVolume: 8, evenings: 0, sundays: 2, createdAt: '2019-06-01T23:00:00' },
      ],
    }],
    subscriptionsHistory: [],
    payment: { bankAccountOwner: 'David gaudu', mandates: [{ rum: 'R012345678903456789' }] },
    fundings: [
      {
        _id: new ObjectID(),
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayer._id,
        subscription: subId2,
        frequency: ONCE,
        versions: [{
          folderNumber: 'D123456',
          startDate: new Date('2019-10-01'),
          createdAt: new Date('2019-10-01'),
          endDate: new Date('2020-02-01'),
          effectiveDate: new Date('2019-10-01'),
          amountTTC: 1200,
          customerParticipationRate: 66,
          careDays: [0, 1, 2, 3, 4, 5, 6],
        },
        {
          folderNumber: 'D123456',
          startDate: new Date('2020-02-02'),
          createdAt: new Date('2020-02-02'),
          effectiveDate: new Date('2020-02-02'),
          amountTTC: 1600,
          customerParticipationRate: 66,
          careDays: [0, 1, 2, 3, 4, 5],
        }],
      },
    ],
  },
];

const bill = {
  _id: new ObjectID(),
  company: customersList[4].company,
  number: 'FACT-1901001',
  date: '2019-05-29',
  customer: customersList[4]._id,
  netInclTaxes: 75.96,
  subscriptions: [{
    startDate: '2019-05-29',
    endDate: '2019-11-29',
    subscription: customersList[5].subscriptions[0]._id,
    service: {
      serviceId: new ObjectID(),
      name: 'Temps de qualité - autonomie',
      nature: 'fixed',
    },
    vat: 5.5,
    events: [{
      eventId: new ObjectID(),
      startDate: '2019-01-16T09:30:19.543Z',
      endDate: '2019-01-16T11:30:21.653Z',
      auxiliary: referentList[0]._id,
      inclTaxesCustomer: 12,
      exclTaxesCustomer: 10,
    }],
    hours: 8,
    unitExclTaxes: 9,
    unitInclTaxes: 9.495,
    exclTaxes: 72,
    inclTaxes: 75.96,
    discount: 0,
  }],
};

const payment = {
  _id: new ObjectID(),
  company: customersList[5].company,
  number: 'REG-101031900201',
  date: '2019-05-26T15:47:42',
  customer: customersList[5]._id,
  netInclTaxes: 190,
  nature: 'payment',
  type: 'direct_debit',
};

const creditNote = {
  _id: new ObjectID(),
  date: '2020-01-01',
  startDate: '2020-01-01',
  endDate: '2020-01-12',
  customer: customersList[6]._id,
  exclTaxesCustomer: 100,
  inclTaxesCustomer: 112,
  isEditable: true,
  company: authCompany._id,
};

const taxCertificate = {
  _id: new ObjectID(),
  company: authCompany._id,
  customer: customersList[7]._id,
  year: '2019',
};

const referentHistories = [
  {
    customer: customersList[0]._id,
    auxiliary: referentList[0]._id,
    company: customersList[0].company,
    startDate: '2020-05-13T00:00:00',
  },
  {
    customer: customersList[0]._id,
    auxiliary: referentList[1]._id,
    company: customersList[0].company,
    startDate: '2019-05-13T00:00:00',
  },
];

const otherCompanyCustomer = {
  company: otherCompany._id,
  _id: otherCompanyCustomerId,
  name: 'notFromCompany',
  prefixNumber: 103,
  identity: {
    title: 'mr',
    firstname: 'test',
    lastname: 'test',
  },
  driveFolder: { driveId: '09876543' },
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de Ponthieu 75018 Paris',
      zipCode: '75018',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0698765432',
  },
  subscriptions: [
    {
      _id: new ObjectID(),
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
      title: 'mr',
    },
    approvalDate: '2018-01-01T10:00:00.000+01:00',
  }],
  payment: {
    bankAccountOwner: 'David gaudu',
    iban: '',
    bic: '',
    mandates: [
      {
        _id: new ObjectID(),
        rum: 'R012345678903456789',
      },
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
};

const userList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { firstname: 'HelperForCustomer', lastname: 'Test' },
    local: { email: 'helper_for_customer_customer@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'helper')._id },
    customers: [customersList[0]._id],
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { firstname: 'HelperForCustomer2', lastname: 'Test' },
    local: { email: 'helper_for_customer_customer2@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'helper')._id },
    customers: [customersList[1]._id],
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { firstname: 'HelperForCustomer4', lastname: 'Test' },
    local: { email: 'helper_for_customer_customer4@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'helper')._id },
    customers: [customersList[3]._id],
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    company: otherCompany._id,
    identity: { firstname: 'HelperForCustomerOtherCompany', lastname: 'Test' },
    local: { email: 'helper_for_customer_other_company@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'helper')._id },
    customers: otherCompanyCustomerId,
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    company: otherCompany._id,
    identity: { firstname: 'AdminForOtherCompany', lastname: 'Test' },
    local: { email: 'admin_for_other_company@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'client_admin')._id },
    origin: WEBAPP,
  },
];

const eventList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    isBilled: true,
    customer: customersList[0]._id,
    type: 'intervention',
    bills: {},
    sector: new ObjectID(),
    subscription: subId,
    startDate: '2019-01-16T14:30:19.543Z',
    endDate: '2019-01-16T15:30:21.653Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    isBilled: false,
    company: authCompany._id,
    customer: customersList[0]._id,
    type: 'intervention',
    bills: {},
    sector: new ObjectID(),
    subscription: subId,
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T15:30:21.653Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    sector: new ObjectID(),
    company: authCompany._id,
    type: 'intervention',
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
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    _id: new ObjectID(),
    company: otherCompany._id,
    isBilled: true,
    customer: otherCompanyCustomerId,
    type: 'intervention',
    bills: {
      thirdPartyPayer: new ObjectID(),
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
      inclTaxesTpp: 10,
      exclTaxesTpp: 5,
      fundingId: new ObjectID(),
      nature: 'hourly',
      careHours: 2,
    },
    sector: new ObjectID(),
    subscription: new ObjectID(),
    startDate: '2019-01-16T14:30:19.543Z',
    endDate: '2019-01-16T15:30:21.653Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
];

const helpersList = [
  {
    customer: customersList[0]._id,
    user: userList[0]._id,
    company: authCompany._id,
  },
  {
    customer: customersList[1]._id,
    user: userList[1]._id,
    company: authCompany._id,
  },
];

const populateDB = async () => {
  await Service.deleteMany({});
  await Customer.deleteMany({});
  await Event.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await QuoteNumber.deleteMany({});
  await User.deleteMany({});
  await ReferentHistory.deleteMany({});
  await Bill.deleteMany({});
  await Payment.deleteMany({});
  await CreditNote.deleteMany({});
  await TaxCertificate.deleteMany({});
  await Helper.deleteMany({});

  await populateDBForAuthentication();
  await (new ThirdPartyPayer(customerThirdPartyPayer)).save();
  await Service.insertMany(customerServiceList);
  await Customer.insertMany([...customersList, otherCompanyCustomer]);
  await Event.insertMany(eventList);
  await ReferentHistory.insertMany(referentHistories);
  await Helper.insertMany(helpersList);
  for (const user of userList) {
    await (new User(user).save());
  }
  for (const user of referentList) {
    await (new User(user).save());
  }
  await (new Bill(bill).save());
  await (new Payment(payment).save());
  await (new CreditNote(creditNote).save());
  await (new TaxCertificate(taxCertificate).save());
};

module.exports = {
  customersList,
  userList,
  populateDB,
  customerServiceList,
  customerThirdPartyPayer,
  otherCompanyCustomer,
};
