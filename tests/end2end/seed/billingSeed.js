const moment = require('moment');
const { ObjectID } = require('mongodb');
const TaxCertificate = require('../../../src/models/TaxCertificate.js');
const Payment = require('../../../src/models/Payment.js');
const Bill = require('../../../src/models/Bill.js');
const { populateAuthentication } = require('./authenticationSeed');
const { authCompany } = require('../../seed/companySeed');
const { customerList } = require('../../seed/customerSeed');
const { serviceList } = require('../../seed/serviceSeed');
const { thirdPartyPayerList } = require('../../seed/thirdPartyPayerSeed');
const { userList } = require('../../seed/userSeed');
const { PAYMENT, REFUND } = require('../../../src/helpers/constants');

const taxCertificateList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    customer: customerList[0]._id,
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
    customer: customerList[0]._id,
    netInclTaxes: 10,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `REG-101${previousMonth.format('MMYY')}00201`,
    date: previousMonth.startOf('d').toDate(),
    customer: customerList[0]._id,
    netInclTaxes: 10,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `REMB-101${previousMonth.format('MMYY')}00201`,
    date: previousMonth.startOf('d').toDate(),
    customer: customerList[0]._id,
    netInclTaxes: 5,
    nature: REFUND,
    type: 'bank_transfer',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `REG-101${previousMonth.format('MMYY')}00202`,
    date: previousMonth.startOf('d').toDate(),
    customer: customerList[0]._id,
    thirdPartyPayer: thirdPartyPayerList[0]._id,
    netInclTaxes: 20,
    nature: PAYMENT,
    type: 'direct_debit',
  },
];

const service = {
  serviceId: serviceList[0]._id,
  name: serviceList[0].versions[0].name,
  nature: serviceList[0].nature,
};
const eventId = new ObjectID();

const billList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `FACT-101${twoMonthBefore.format('MMYY')}00001`,
    date: twoMonthBefore.endOf('M').toDate(),
    customer: customerList[0]._id,
    thirdPartyPayer: thirdPartyPayerList[0]._id,
    netInclTaxes: 20,
    subscriptions: [
      {
        startDate: new Date('2019-05-29'),
        endDate: new Date('2019-11-29'),
        subscription: customerList[0].subscriptions[0]._id,
        service,
        vat: 12,
        events: [
          {
            eventId,
            fundingId: customerList[0].fundings[0]._id,
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
    customer: customerList[0]._id,
    netInclTaxes: 10,
    subscriptions: [
      {
        startDate: new Date('2019-05-29'),
        endDate: new Date('2019-11-29'),
        subscription: customerList[0].subscriptions[0]._id,
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
        service,
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
    customer: customerList[0]._id,
    netInclTaxes: 10,
    subscriptions: [
      {
        startDate: new Date('2019-05-29'),
        endDate: new Date('2019-11-29'),
        subscription: customerList[0].subscriptions[0]._id,
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
        service,
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

  await populateAuthentication();

  await TaxCertificate.insertMany(taxCertificateList);
  await Payment.insertMany(paymentList);
  await Bill.insertMany(billList);
};

module.exports = { populateBilling };
