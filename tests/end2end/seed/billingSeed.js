const moment = require('moment');
const { ObjectID } = require('mongodb');
const TaxCertificate = require('../../../src/models/TaxCertificate');
const Payment = require('../../../src/models/Payment');
const Bill = require('../../../src/models/Bill');
const Customer = require('../../../src/models/Customer');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const Service = require('../../../src/models/Service');
const { populateAuthentication } = require('./authenticationSeed');
const { authCompany } = require('../../seed/companySeed');
const { authCustomer } = require('../../seed/customerSeed');
const { userList } = require('../../seed/userSeed');
const { PAYMENT, REFUND, FIXED, ONCE, HOURLY, COMPANY_CONTRACT } = require('../../../src/helpers/constants');

const subscriptionId = new ObjectID();

const service = {
  _id: new ObjectID(),
  type: COMPANY_CONTRACT,
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    startDate: '2019-01-16T17:58:15',
    vat: 12,
    exemptFromCharges: false,
  }],
  nature: HOURLY,
};

const thirdPartyPayer = { _id: new ObjectID(), name: 'Toto', company: authCompany._id, isApa: true };

const customer = {
  ...authCustomer,
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
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  subscriptions: [{
    _id: subscriptionId,
    service: service._id,
    versions: [
      { unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1, createdAt: '2020-01-01T23:00:00' },
      { unitTTCRate: 10, estimatedWeeklyVolume: 8, evenings: 0, sundays: 2, createdAt: '2019-06-01T23:00:00' },
    ],
  }],
  payment: {
    bankAccountOwner: 'David gaudu',
    iban: '',
    bic: '',
    mandates: [{ rum: 'R012345678903456789' }],
  },
  fundings: [
    {
      _id: new ObjectID(),
      nature: FIXED,
      thirdPartyPayer: thirdPartyPayer._id,
      subscription: subscriptionId,
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
};

const taxCertificateList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    customer: customer._id,
    year: '2019',
    date: moment().subtract(1, 'y').endOf('y').toDate(),
  },
];

const previousYear = moment().subtract(1, 'y').date(3);
const previousMonth = moment().subtract(1, 'M').date(5);
const twoMonthBefore = moment().subtract(2, 'M');

const paymentList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `REG-101${previousYear.format('MMYY')}00101`,
    date: previousYear.startOf('d').toDate(),
    customer: customer._id,
    netInclTaxes: 10,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `REG-101${previousMonth.format('MMYY')}00201`,
    date: previousMonth.startOf('d').toDate(),
    customer: customer._id,
    netInclTaxes: 10,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `REMB-101${previousMonth.format('MMYY')}00201`,
    date: previousMonth.startOf('d').toDate(),
    customer: customer._id,
    netInclTaxes: 5,
    nature: REFUND,
    type: 'bank_transfer',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `REG-101${previousMonth.format('MMYY')}00202`,
    date: previousMonth.startOf('d').toDate(),
    customer: customer._id,
    thirdPartyPayer: thirdPartyPayer._id,
    netInclTaxes: 20,
    nature: PAYMENT,
    type: 'direct_debit',
  },
];

const eventId = new ObjectID();
const billService = { serviceId: service._id, name: service.versions[0].name, nature: service.nature };
const billList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `FACT-101${twoMonthBefore.format('MMYY')}00001`,
    date: twoMonthBefore.endOf('M').toDate(),
    customer: customer._id,
    thirdPartyPayer: thirdPartyPayer._id,
    netInclTaxes: 20,
    subscriptions: [
      {
        startDate: new Date('2019-05-29'),
        endDate: new Date('2019-11-29'),
        subscription: customer.subscriptions[0]._id,
        service: billService,
        vat: 12,
        events: [
          {
            eventId,
            fundingId: customer.fundings[0]._id,
            startDate: twoMonthBefore.set({ hours: 10, minutes: 0 }),
            endDate: twoMonthBefore.set({ hours: 12, minutes: 30 }),
            auxiliary: userList[2]._id,
            inclTaxesTpp: 20,
            exclTaxesTpp: 17.86,
          },
        ],
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
    company: authCompany._id,
    number: `FACT-101${previousYear.format('MMYY')}00004`,
    date: previousYear.endOf('M').toDate(),
    customer: customer._id,
    netInclTaxes: 10,
    subscriptions: [
      {
        startDate: new Date('2019-05-29'),
        endDate: new Date('2019-11-29'),
        subscription: customer.subscriptions[0]._id,
        vat: 12,
        events: [
          {
            eventId,
            startDate: previousYear.set({ hours: 10, minutes: 0 }),
            endDate: previousYear.set({ hours: 12, minutes: 30 }),
            auxiliary: userList[2]._id,
            inclTaxesCustomer: 10,
            exclTaxesCustomer: 8.93,
          },
        ],
        service: billService,
        hours: 2.5,
        unitInclTaxes: 12,
        exclTaxes: 8.93,
        inclTaxes: 10,
        discount: 0,
      },
    ],
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `FACT-101${twoMonthBefore.format('MMYY')}00002`,
    date: twoMonthBefore.endOf('M').toDate(),
    customer: customer._id,
    netInclTaxes: 10,
    subscriptions: [
      {
        startDate: new Date('2019-05-29'),
        endDate: new Date('2019-11-29'),
        subscription: customer.subscriptions[0]._id,
        vat: 12,
        events: [
          {
            eventId,
            startDate: twoMonthBefore.set({ hours: 10, minutes: 0 }),
            endDate: twoMonthBefore.set({ hours: 12, minutes: 30 }),
            auxiliary: userList[2]._id,
            inclTaxesCustomer: 10,
            exclTaxesCustomer: 8.93,
          },
        ],
        service: billService,
        hours: 2.5,
        unitInclTaxes: 12,
        exclTaxes: 8.93,
        inclTaxes: 10,
        discount: 0,
      },
    ],
  },
];

const populateBilling = async () => {
  await TaxCertificate.deleteMany({});
  await Payment.deleteMany({});
  await Bill.deleteMany({});
  await Customer.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await Service.deleteMany({});

  await populateAuthentication();

  await TaxCertificate.insertMany(taxCertificateList);
  await Payment.insertMany(paymentList);
  await Bill.insertMany(billList);
  await (new Customer(customer)).save();
  await new ThirdPartyPayer(thirdPartyPayer).save();
  await new Service(service).save();
};

module.exports = { populateBilling };
