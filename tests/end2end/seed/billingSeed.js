const { v4: uuidv4 } = require('uuid');
const { ObjectID } = require('mongodb');
const TaxCertificate = require('../../../src/models/TaxCertificate');
const Payment = require('../../../src/models/Payment');
const Bill = require('../../../src/models/Bill');
const Customer = require('../../../src/models/Customer');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const Contract = require('../../../src/models/Contract');
const Event = require('../../../src/models/Event');
const Helper = require('../../../src/models/Helper');
const User = require('../../../src/models/User');
const FundingHistory = require('../../../src/models/FundingHistory');
const Service = require('../../../src/models/Service');
const { populateAuthentication } = require('./authenticationSeed');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { userList, helper } = require('../../seed/authUsersSeed');
const { rolesList } = require('../../seed/authRolesSeed');
const {
  PAYMENT,
  REFUND,
  FIXED,
  ONCE,
  HOURLY,
  MONTHLY,
  WEBAPP,
} = require('../../../src/helpers/constants');

const subscriptions = [{ _id: new ObjectID() }, { _id: new ObjectID() }];

const services = [{
  _id: new ObjectID(),
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    startDate: '2019-01-16T17:58:15',
    vat: 12,
    exemptFromCharges: false,
  }],
  nature: HOURLY,
}, {
  _id: new ObjectID(),
  company: otherCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 2',
    startDate: '2019-01-16T17:58:15.519',
    vat: 12,
    exemptFromCharges: false,
  }],
  nature: HOURLY,
}];

const thirdPartyPayer = {
  _id: new ObjectID(),
  name: 'Toto',
  company: authCompany._id,
  isApa: true,
  billingMode: 'direct',
};

const billAuthcustomer = {
  _id: new ObjectID(),
  company: authCompany._id,
  email: 'fake@test.com',
  identity: { title: 'mr', firstname: 'Romain', lastname: 'Bardet' },
  contact: {
    primaryAddress: {
      fullAddress: '12 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '12 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  subscriptions: [{
    _id: subscriptions[0]._id,
    service: services[0]._id,
    versions: [
      { unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1, createdAt: '2020-01-01T23:00:00' },
      { unitTTCRate: 10, estimatedWeeklyVolume: 8, evenings: 0, sundays: 2, createdAt: '2019-06-01T23:00:00' },
    ],
  }],
  payment: {
    bankAccountOwner: 'David gaudu',
    iban: 'FR3617569000306699167186M11',
    bic: 'ABNAFRPP',
    mandates: [{ rum: 'R012345678903456789' }],
  },
  fundings: [
    {
      _id: new ObjectID(),
      nature: FIXED,
      thirdPartyPayer: thirdPartyPayer._id,
      subscription: subscriptions[0]._id,
      frequency: ONCE,
      versions: [{
        folderNumber: 'D123456',
        startDate: new Date('2019-10-01'),
        createdAt: new Date('2019-10-01'),
        endDate: new Date('2020-02-01'),
        effectiveDate: new Date('2019-10-01'),
        amountTTC: 1200,
        careDays: [0, 1, 2, 3, 4, 5, 6],
      },
      {
        folderNumber: 'D123456',
        startDate: new Date('2020-02-02'),
        createdAt: new Date('2020-02-02'),
        effectiveDate: new Date('2020-02-02'),
        amountTTC: 160,
        careDays: [0, 1, 2, 3, 4, 5],
      }],
    },
  ],
};

const customerList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Hugues', lastname: 'Aufray' },
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
    payment: {
      bankAccountOwner: 'Thierry Omeyer',
      iban: 'FR3514508000505917721779B43',
      bic: 'BNMDHISOBD',
      mandates: [{ rum: 'R09876543456765443', _id: new ObjectID(), signedAt: '2021-07-13T00:00:00' }],
    },
    subscriptions: [{
      _id: new ObjectID(),
      service: services[0]._id,
      versions: [{
        unitTTCRate: 10,
        estimatedWeeklyVolume: 15,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    }, {
      _id: new ObjectID(),
      service: services[1]._id,
      versions: [{
        unitTTCRate: 11,
        estimatedWeeklyVolume: 14,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    }],
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Elie', lastname: 'Yaffa' },
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
    subscriptions: [{
      _id: subscriptions[1]._id,
      service: services[0]._id,
      versions: [{
        unitTTCRate: 20,
        estimatedWeeklyVolume: 21,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    }],
    payment: {
      bankAccountOwner: 'Tchoupi',
      mandates: [{ rum: 'R012345678903456789', _id: new ObjectID() }],
    },
    fundings: [
      {
        _id: new ObjectID(),
        nature: FIXED,
        thirdPartyPayer: thirdPartyPayer._id,
        subscription: subscriptions[1]._id,
        frequency: MONTHLY,
        versions: [{
          folderNumber: 'D987654',
          startDate: new Date('2018-05-02'),
          createdAt: new Date('2018-05-02'),
          effectiveDate: new Date('2018-05-02'),
          amountTTC: 2000,
          customerParticipationRate: 22,
          careDays: [0, 1, 2, 3, 4, 5, 6, 7],
        }],
      },
    ],
  },
  {
    _id: new ObjectID(),
    company: otherCompany._id,
    identity: { title: 'mr', firstname: 'Christine', lastname: 'AndTheQueens' },
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
    subscriptions: [{
      _id: new ObjectID(),
      service: services[1]._id,
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    }],
    payment: {
      bankAccountOwner: 'Roberto Alagna',
      mandates: [{ rum: 'R014345658903456780', _id: new ObjectID() }],
    },
  },
];

const customerTaxCertificateList = [{
  _id: new ObjectID(),
  company: authCompany._id,
  customer: billAuthcustomer._id,
  year: '2019',
  date: '2020-05-31T00:00:00',
}];

const customerPaymentList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'REG-101081900101',
    date: '2019-08-21T00:00:00',
    customer: billAuthcustomer._id,
    netInclTaxes: 10,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'REG-101072000201',
    date: '2020-07-23T00:00:00',
    customer: billAuthcustomer._id,
    netInclTaxes: 10,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'REMB-101072000201',
    date: '2020-07-23T00:00:00',
    customer: billAuthcustomer._id,
    netInclTaxes: 5,
    nature: REFUND,
    type: 'bank_transfer',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'REG-101072000202',
    date: '2020-07-23T00:00:00',
    customer: billAuthcustomer._id,
    thirdPartyPayer: thirdPartyPayer._id,
    netInclTaxes: 20,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'REG-101072000205',
    date: '2020-07-23T00:00:00',
    customer: customerList[1]._id,
    thirdPartyPayer: thirdPartyPayer._id,
    netInclTaxes: 22,
    nature: PAYMENT,
    type: 'direct_debit',
  },
];

const billUserList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Louise', lastname: 'Michel' },
    local: { email: 'louise@michel.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    company: authCompany._id,
    contracts: [new ObjectID()],
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Murielle', lastname: 'Penicaud' },
    local: { email: 'mumu@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    company: otherCompany._id,
    contracts: [new ObjectID()],
    origin: WEBAPP,
  },
];

const contracts = [
  {
    createdAt: '2018-12-04T16:34:04.144Z',
    user: billUserList[0]._id,
    serialNumber: 'sdfasdcssdcasdcas',
    startDate: '2018-12-03T23:00:00.000Z',
    _id: billUserList[0].contracts[0],
    company: authCompany._id,
    versions: [{
      createdAt: '2018-12-04T16:34:04.144Z',
      grossHourlyRate: 10.28,
      startDate: '2018-12-03T23:00:00.000Z',
      weeklyHours: 9,
      _id: new ObjectID(),
    }],
  },
  {
    createdAt: '2018-12-04T16:34:04.144Z',
    user: billUserList[1]._id,
    serialNumber: 'sdfasdgfadsgscqw',
    startDate: '2018-12-03T23:00:00.000Z',
    _id: billUserList[1].contracts[0],
    company: otherCompany._id,
    versions: [{
      createdAt: '2018-12-04T16:34:04.144Z',
      grossHourlyRate: 10.28,
      startDate: '2018-12-03T23:00:00.000Z',
      weeklyHours: 9,
      _id: new ObjectID(),
    }],
  },
];

const eventId = new ObjectID();
const billService = { serviceId: services[0]._id, name: services[0].versions[0].name, nature: services[0].nature };
const authBillList = [
  {
    _id: new ObjectID(),
    type: 'automatic',
    company: authCompany._id,
    number: 'FACT-101062000001',
    date: '2020-06-30T00:00:00',
    customer: billAuthcustomer._id,
    thirdPartyPayer: thirdPartyPayer._id,
    netInclTaxes: 20,
    subscriptions: [
      {
        startDate: new Date('2019-05-29'),
        endDate: new Date('2019-11-29'),
        subscription: billAuthcustomer.subscriptions[0]._id,
        service: billService,
        vat: 12,
        events: [{
          eventId,
          fundingId: billAuthcustomer.fundings[0]._id,
          startDate: '2020-06-24T10:00:00',
          endDate: '2020-06-24T12:30:00',
          auxiliary: userList[2]._id,
          inclTaxesTpp: 20,
          exclTaxesTpp: 17.86,
        }],
        hours: 2.5,
        unitInclTaxes: 12,
        exclTaxes: 17.86,
        inclTaxes: 20,
        discount: 0,
      },
    ],
  },
  {
    _id: new ObjectID(),
    type: 'automatic',
    company: authCompany._id,
    number: 'FACT-101081900004',
    date: '2019-08-31T00:00:00',
    customer: billAuthcustomer._id,
    netInclTaxes: 10,
    subscriptions: [{
      startDate: new Date('2019-05-29'),
      endDate: new Date('2019-11-29'),
      subscription: billAuthcustomer.subscriptions[0]._id,
      vat: 12,
      events: [{
        eventId,
        startDate: '2019-08-24T10:00:00',
        endDate: '2019-08-24T12:30:00',
        auxiliary: userList[2]._id,
        inclTaxesCustomer: 10,
        exclTaxesCustomer: 8.93,
      }],
      service: billService,
      hours: 2.5,
      unitInclTaxes: 12,
      exclTaxes: 8.93,
      inclTaxes: 10,
      discount: 0,
    }],
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    type: 'automatic',
    number: 'FACT-101062000002',
    date: '2020-06-30T00:00:00',
    customer: billAuthcustomer._id,
    netInclTaxes: 10,
    subscriptions: [{
      startDate: new Date('2019-05-29'),
      endDate: new Date('2019-11-29'),
      subscription: billAuthcustomer.subscriptions[0]._id,
      vat: 12,
      events: [{
        eventId,
        startDate: '2020-06-24T10:00:00',
        endDate: '2020-06-24T12:30:00',
        auxiliary: userList[2]._id,
        inclTaxesCustomer: 10,
        exclTaxesCustomer: 8.93,
      }],
      service: billService,
      hours: 2.5,
      unitInclTaxes: 12,
      exclTaxes: 8.93,
      inclTaxes: 10,
      discount: 0,
    }],
  },
];

const eventList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'intervention',
    startDate: '2019-01-16T09:00:00.543Z',
    endDate: '2019-01-16T10:00:00.653Z',
    auxiliary: billUserList[0]._id,
    customer: customerList[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customerList[0].subscriptions[0]._id,
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
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'intervention',
    startDate: '2019-01-17T16:00:19.543Z',
    endDate: '2019-01-17T18:00:19.543Z',
    auxiliary: billUserList[0]._id,
    customer: customerList[0]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerList[0].subscriptions[0]._id,
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
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'intervention',
    startDate: '2019-01-18T14:00:19.543Z',
    endDate: '2019-01-18T18:00:19.543Z',
    auxiliary: billUserList[1]._id,
    customer: customerList[1]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    subscription: customerList[1].subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector: new ObjectID(),
    type: 'intervention',
    startDate: '2019-01-19T14:30:00.543Z',
    endDate: '2019-01-19T19:30:00.543Z',
    auxiliary: billUserList[1]._id,
    customer: customerList[2]._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customerList[2].subscriptions[0]._id,
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
];

const fundingHistory = {
  _id: new ObjectID(),
  fundingId: new ObjectID(),
  amountTTC: 12,
  nature: 'fixed',
  company: authCompany._id,
};

const helperList = [{ user: helper._id, customer: billAuthcustomer._id, company: authCompany._id, referent: false }];

const populateBilling = async () => {
  await TaxCertificate.deleteMany();
  await Payment.deleteMany();
  await Bill.deleteMany();
  await Customer.deleteMany();
  await ThirdPartyPayer.deleteMany();
  await Service.deleteMany();
  await Event.deleteMany();
  await User.deleteMany();
  await FundingHistory.deleteMany();
  await Contract.deleteMany();
  await Helper.deleteMany();

  await populateAuthentication();

  await TaxCertificate.insertMany(customerTaxCertificateList);
  await Payment.insertMany(customerPaymentList);
  await Bill.insertMany(authBillList);
  await new ThirdPartyPayer(thirdPartyPayer).save();
  await Service.insertMany(services);
  await Customer.insertMany(customerList.concat(billAuthcustomer));
  await User.create(billUserList);
  await Contract.create(contracts);
  await Event.insertMany(eventList);
  await FundingHistory.create(fundingHistory);
  await Helper.create(helperList);
};

module.exports = { populateBilling };
