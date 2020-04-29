const { ObjectID } = require('mongodb');
const moment = require('moment');
const { authCompany } = require('./companySeed');
const { customerList } = require('./customerSeed');
const { serviceList } = require('./serviceSeed');
const { userList } = require('./userSeed');
const { thirdPartyPayerList } = require('./thirdPartyPayerSeed');

const service = {
  serviceId: serviceList[0]._id,
  name: serviceList[0].versions[0].name,
  nature: serviceList[0].nature,
};
const eventId = new ObjectID();
const previousDate = moment().subtract(2, 'M');

const billList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: `FACT-101${previousDate.format('MMYY')}00001`,
    date: previousDate.endOf('M').toDate(),
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
            startDate: previousDate.set({ hours: 10, minutes: 0 }),
            endDate: previousDate.set({ hours: 12, minutes: 30 }),
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
    number: `FACT-101${previousDate.format('MMYY')}00002`,
    date: previousDate.endOf('M').toDate(),
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
            startDate: previousDate.set({ hours: 10, minutes: 0 }),
            endDate: previousDate.set({ hours: 12, minutes: 30 }),
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

module.exports = { billList };
