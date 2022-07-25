const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
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
  HOURLY,
  MONTHLY,
  WEBAPP,
} = require('../../../src/helpers/constants');
const Surcharge = require('../../../src/models/Surcharge');

const subscriptions = [{ _id: new ObjectId() }, { _id: new ObjectId() }];

const surcharge = {
  _id: new ObjectId(),
  company: authCompany._id,
  name: 'Chasse aux monstres hivernaux',
  saturday: 25,
  sunday: 20,
  publicHoliday: 12,
  twentyFifthOfDecember: 50,
  firstOfMay: 30,
  firstOfJanuary: 32,
  evening: 10,
  eveningStartTime: '20:00',
  eveningEndTime: '23:00',
  custom: 200,
  customStartTime: '13:59',
  customEndTime: '14:01',
};

const services = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 1',
      startDate: '2019-01-16T17:58:15.000Z',
      vat: 12,
      exemptFromCharges: false,
      surcharge: surcharge._id,
    }],
    nature: HOURLY,
  },
  {
    _id: new ObjectId(),
    company: otherCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 2',
      startDate: '2019-01-16T17:58:15.000Z',
      vat: 12,
      exemptFromCharges: false,
    }],
    nature: HOURLY,
  }];

const thirdPartyPayer = {
  _id: new ObjectId(),
  name: 'Toto',
  company: authCompany._id,
  isApa: true,
  billingMode: 'direct',
};

const billAuthcustomer = {
  _id: new ObjectId(),
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
      {
        unitTTCRate: 27,
        weeklyHours: 12,
        evenings: 2,
        sundays: 1,
        saturdays: 3,
        weeklyCount: 0,
        createdAt: '2020-01-01T12:00:00.000Z',
      },
      {
        unitTTCRate: 26,
        weeklyHours: 8,
        evenings: 0,
        saturdays: 0,
        sundays: 2,
        weeklyCount: 0,
        createdAt: '2019-06-01T12:00:00.000Z',
      },
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
      _id: new ObjectId(),
      nature: HOURLY,
      thirdPartyPayer: thirdPartyPayer._id,
      subscription: subscriptions[0]._id,
      frequency: MONTHLY,
      versions: [{
        folderNumber: 'D123456',
        startDate: '2019-10-01T00:00:00.000Z',
        createdAt: '2019-10-01T00:00:00.000Z',
        endDate: '2020-02-01T00:00:00.000Z',
        effectiveDate: '2019-10-01T00:00:00.000Z',
        unitTTCRate: 20,
        careHours: 12,
        customerParticipationRate: 15,
        careDays: [0, 1, 2, 3, 4, 5, 6],
      },
      {
        folderNumber: 'D123456',
        startDate: '2020-02-02T00:00:00.000Z',
        createdAt: '2020-02-02T00:00:00.000Z',
        effectiveDate: '2020-02-02T00:00:00.000Z',
        unitTTCRate: 22,
        careHours: 10,
        customerParticipationRate: 10,
        careDays: [0, 1, 2, 3, 4, 5],
      }],
    },
  ],
};

const customerList = [
  {
    _id: new ObjectId(),
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
      mandates: [{ rum: 'R09876543456765443', _id: new ObjectId(), signedAt: '2021-07-13T00:00:00.000Z' }],
    },
    subscriptions: [{
      _id: new ObjectId(),
      service: services[0]._id,
      versions: [{
        unitTTCRate: 10,
        weeklyHours: 15,
        weeklyCount: 0,
        evenings: 2,
        saturdays: 1,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000Z',
      }],
    }, {
      _id: new ObjectId(),
      service: services[1]._id,
      versions: [{
        unitTTCRate: 11,
        weeklyHours: 14,
        weeklyCount: 0,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000Z',
      }],
    }],
  },
  {
    _id: new ObjectId(),
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
        weeklyHours: 21,
        weeklyCount: 0,
        evenings: 2,
        saturdays: 1,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000Z',
      }],
    }],
    payment: {
      bankAccountOwner: 'Tchoupi',
      mandates: [{ rum: 'R012345678903456789', _id: new ObjectId() }],
    },
    fundings: [
      {
        _id: new ObjectId(),
        nature: FIXED,
        thirdPartyPayer: thirdPartyPayer._id,
        subscription: subscriptions[1]._id,
        frequency: MONTHLY,
        versions: [{
          folderNumber: 'D987654',
          startDate: '2018-05-02T00:00:00.000Z',
          createdAt: '2018-05-02T00:00:00.000Z',
          effectiveDate: '2018-05-02T00:00:00.000Z',
          amountTTC: 2000,
          customerParticipationRate: 22,
          careDays: [0, 1, 2, 3, 4, 5, 6, 7],
        }],
      },
    ],
  },
  {
    _id: new ObjectId(),
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
      _id: new ObjectId(),
      service: services[1]._id,
      versions: [{
        unitTTCRate: 12,
        weeklyHours: 12,
        weeklyCount: 0,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000Z',
      }],
    }],
    payment: {
      bankAccountOwner: 'Roberto Alagna',
      mandates: [{ rum: 'R014345658903456780', _id: new ObjectId() }],
    },
  },
];

const customerTaxCertificateList = [{
  _id: new ObjectId(),
  company: authCompany._id,
  customer: billAuthcustomer._id,
  year: '2019',
  date: '2020-05-31T00:00:00.000Z',
}];

const customerPaymentList = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    number: 'REG-101081900101',
    date: '2019-08-21T00:00:00.000Z',
    customer: billAuthcustomer._id,
    netInclTaxes: 10,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    number: 'REG-101072000201',
    date: '2020-07-23T00:00:00.000Z',
    customer: billAuthcustomer._id,
    netInclTaxes: 10,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    number: 'REMB-101072000201',
    date: '2020-07-23T00:00:00.000Z',
    customer: billAuthcustomer._id,
    netInclTaxes: 5,
    nature: REFUND,
    type: 'bank_transfer',
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    number: 'REG-101072000202',
    date: '2020-07-23T00:00:00.000Z',
    customer: billAuthcustomer._id,
    thirdPartyPayer: thirdPartyPayer._id,
    netInclTaxes: 20,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    number: 'REG-101072000205',
    date: '2020-07-23T00:00:00.000Z',
    customer: customerList[1]._id,
    thirdPartyPayer: thirdPartyPayer._id,
    netInclTaxes: 22,
    nature: PAYMENT,
    type: 'direct_debit',
  },
];

const billUserList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'Louise', lastname: 'Michel' },
    local: { email: 'louise@michel.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    company: authCompany._id,
    contracts: [new ObjectId()],
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Murielle', lastname: 'Penicaud' },
    local: { email: 'mumu@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    company: otherCompany._id,
    contracts: [new ObjectId()],
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
      _id: new ObjectId(),
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
      _id: new ObjectId(),
    }],
  },
];

const eventId = new ObjectId();
const billService = { serviceId: services[0]._id, name: services[0].versions[0].name, nature: services[0].nature };
const authBillList = [
  {
    _id: new ObjectId(),
    type: 'automatic',
    company: authCompany._id,
    number: 'FACT-101062000001',
    date: '2020-06-30T00:00:00.000Z',
    customer: billAuthcustomer._id,
    thirdPartyPayer: thirdPartyPayer._id,
    netInclTaxes: 20,
    subscriptions: [
      {
        startDate: '2019-05-29T00:00:00.000Z',
        endDate: '2019-11-29T00:00:00.000Z',
        subscription: billAuthcustomer.subscriptions[0]._id,
        service: billService,
        vat: 12,
        events: [{
          eventId,
          fundingId: billAuthcustomer.fundings[0]._id,
          startDate: '2020-06-24T10:00:00.000Z',
          endDate: '2020-06-24T12:30:00.000Z',
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
    _id: new ObjectId(),
    type: 'automatic',
    company: authCompany._id,
    number: 'FACT-101081900004',
    date: '2019-08-31T00:00:00.000Z',
    customer: billAuthcustomer._id,
    netInclTaxes: 10,
    subscriptions: [{
      startDate: '2019-05-29T00:00:00.000Z',
      endDate: '2019-11-29T00:00:00.000Z',
      subscription: billAuthcustomer.subscriptions[0]._id,
      vat: 12,
      events: [{
        eventId,
        startDate: '2019-08-24T10:00:00.000Z',
        endDate: '2019-08-24T12:30:00.000Z',
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
    _id: new ObjectId(),
    company: authCompany._id,
    type: 'automatic',
    number: 'FACT-101062000002',
    date: '2020-06-30T00:00:00.000Z',
    customer: billAuthcustomer._id,
    netInclTaxes: 10,
    subscriptions: [{
      startDate: '2019-05-29T00:00:00.000Z',
      endDate: '2019-11-29T00:00:00.000Z',
      subscription: billAuthcustomer.subscriptions[0]._id,
      vat: 12,
      events: [{
        eventId,
        startDate: '2020-06-24T10:00:00.000Z',
        endDate: '2020-06-24T12:30:00.000Z',
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
    _id: new ObjectId(),
    company: authCompany._id,
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    sector: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    sector: new ObjectId(),
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
  _id: new ObjectId(),
  fundingId: new ObjectId(),
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
  await Surcharge.deleteMany();
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
  await Surcharge.insertMany([surcharge]);
  await Customer.insertMany(customerList.concat(billAuthcustomer));
  await User.create(billUserList);
  await Contract.create(contracts);
  await Event.insertMany(eventList);
  await FundingHistory.create(fundingHistory);
  await Helper.create(helperList);
};

module.exports = { populateBilling };
