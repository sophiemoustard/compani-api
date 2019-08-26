const { ObjectID } = require('mongodb');
const Event = require('../../../models/Event');
const Customer = require('../../../models/Customer');
const User = require('../../../models/User');
const Bill = require('../../../models/Bill');
const ThirdPartyPayer = require('../../../models/ThirdPartyPayer');
const Payment = require('../../../models/Payment');
const Pay = require('../../../models/Pay');
const Sector = require('../../../models/Sector');
const FinalPay = require('../../../models/FinalPay');
const { rolesList, populateDBForAuthentification } = require('./authentificationSeed');
const { PAYMENT, REFUND } = require('../../../helpers/constants');

const sector = {
  _id: new ObjectID(),
  name: 'Etoile',
};

const auxiliary = {
  _id: new ObjectID(),
  identity: { firstname: 'Lola', lastname: 'Lili' },
  role: rolesList.find(role => role.name === 'admin')._id,
  local: { email: 'toto@alenvi.io', password: '1234567890' },
  sector: sector._id,
};

const customer = {
  _id: new ObjectID(),
  identity: { firstname: 'Lola', lastname: 'Lili' },
  subscriptions: [
    { _id: new ObjectID() },
  ],
};

const thirdPartyPayer = {
  _id: new ObjectID(),
  name: 'Toto',
};

const eventList = [
  {
    _id: new ObjectID(),
    sector,
    type: 'absence',
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary,
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
    sector,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary,
    customer: customer._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customer.subscriptions[0]._id,
  },
  {
    _id: new ObjectID(),
    sector,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary,
    customer: customer._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customer.subscriptions[0]._id,
  },
];

const billsList = [
  {
    _id: new ObjectID(),
    date: '2019-05-29',
    customer: customer._id,
    client: thirdPartyPayer._id,
    netInclTaxes: 75.96,
    subscriptions: [{
      startDate: '2019-05-29',
      endDate: '2019-11-29',
      subscription: customer.subscriptions[0]._id,
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
    date: '2019-05-25',
    customer: customer._id,
    netInclTaxes: 101.28,
    subscriptions: [{
      startDate: '2019-05-25',
      endDate: '2019-11-25',
      subscription: customer.subscriptions[0]._id,
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

const paymentsList = [
  {
    _id: new ObjectID(),
    number: 'REG-1903201',
    date: '2019-05-26T19:47:42',
    customer: customer._id,
    client: thirdPartyPayer._id,
    netInclTaxes: 190,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    number: 'REG-1903202',
    date: '2019-05-24T15:47:42',
    customer: customer._id,
    netInclTaxes: 390,
    nature: PAYMENT,
    type: 'check',
  },
  {
    _id: new ObjectID(),
    number: 'REG-1903203',
    date: '2019-05-27T09:10:20',
    customer: customer._id,
    client: thirdPartyPayer._id,
    netInclTaxes: 220,
    nature: REFUND,
    type: 'direct_debit',
  },
];

const payList = [
  {
    _id: new ObjectID(),
    auxiliary,
    endDate: '2019-01-31T14:00:18',
    startDate: '2019-01-01T14:00:18',
    month: '01-2019',
    contractHours: 151,
    workedHours: 143,
    notSurchargedAndNotExempt: 43,
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    notSurchargedAndExempt: 97,
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    hoursBalance: -8,
    hoursCounter: -20,
    overtimeHours: 0,
    additionalHours: 0,
    mutual: false,
    transport: 10,
    otherFees: 0,
    bonus: 0,
  },
  {
    _id: new ObjectID(),
    auxiliary,
    endDate: '2019-02-28T14:00:18',
    startDate: '2019-01-01T14:00:18',
    month: '02-2019',
    contractHours: 151,
    workedHours: 143,
    notSurchargedAndNotExempt: 43,
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    notSurchargedAndExempt: 97,
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    hoursBalance: -8,
    hoursCounter: -20,
    overtimeHours: 0,
    additionalHours: 0,
    mutual: false,
    transport: 10,
    otherFees: 0,
    bonus: 0,
  },
];

const finalPayList = [
  {
    _id: new ObjectID(),
    auxiliary,
    endDate: '2019-01-31T14:00:18',
    startDate: '2019-01-01T14:00:18',
    endNotificationDate: '2019-01-25T14:00:18',
    endReason: 'salut',
    compensation: 10,
    month: '01-2019',
    contractHours: 151,
    workedHours: 143,
    notSurchargedAndNotExempt: 43,
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    notSurchargedAndExempt: 97,
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    hoursBalance: -8,
    hoursCounter: -20,
    overtimeHours: 0,
    additionalHours: 0,
    mutual: false,
    transport: 10,
    otherFees: 0,
    bonus: 0,
  },
  {
    _id: new ObjectID(),
    auxiliary,
    endDate: '2019-02-28T14:00:18',
    startDate: '2019-01-01T14:00:18',
    endNotificationDate: '2019-02-25T14:00:18',
    endReason: 'salut',
    compensation: 10,
    month: '02-2019',
    contractHours: 151,
    workedHours: 143,
    notSurchargedAndNotExempt: 43,
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    notSurchargedAndExempt: 97,
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    hoursBalance: -8,
    hoursCounter: -20,
    overtimeHours: 0,
    additionalHours: 0,
    mutual: false,
    transport: 10,
    otherFees: 0,
    bonus: 0,
  },
];

const populateEvents = async () => {
  await Event.deleteMany();
  await User.deleteMany();
  await Customer.deleteMany();
  await Sector.deleteMany();

  await populateDBForAuthentification();
  await Event.insertMany(eventList);
  await new User(auxiliary).save();
  await new Sector(sector).save();
  await new Customer(customer).save();
};

const populateBills = async () => {
  await Bill.deleteMany();
  await Customer.deleteMany();
  await ThirdPartyPayer.deleteMany();

  await populateDBForAuthentification();
  await Bill.insertMany(billsList);
  await new Customer(customer).save();
  await new ThirdPartyPayer(thirdPartyPayer).save();
};

const populatePayment = async () => {
  await Payment.deleteMany();
  await Customer.deleteMany();
  await ThirdPartyPayer.deleteMany();

  await populateDBForAuthentification();
  await Payment.insertMany(paymentsList);
  await new Customer(customer).save();
  await new ThirdPartyPayer(thirdPartyPayer).save();
};

const populatePay = async () => {
  await Pay.deleteMany();
  await FinalPay.deleteMany();
  await User.deleteMany();

  await populateDBForAuthentification();
  await Pay.insertMany(payList);
  await FinalPay.insertMany(finalPayList);
  await new User(auxiliary).save();
};

module.exports = {
  populateEvents,
  populateBills,
  populatePayment,
  populatePay,
};
