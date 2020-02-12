const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const Event = require('../../../src/models/Event');
const Customer = require('../../../src/models/Customer');
const User = require('../../../src/models/User');
const Bill = require('../../../src/models/Bill');
const CreditNote = require('../../../src/models/CreditNote');
const Service = require('../../../src/models/Service');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const Payment = require('../../../src/models/Payment');
const Pay = require('../../../src/models/Pay');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const FinalPay = require('../../../src/models/FinalPay');
const Company = require('../../../src/models/Company');
const { rolesList, populateDBForAuthentication, authCompany } = require('./authenticationSeed');
const {
  PAYMENT,
  REFUND,
  FIXED,
  COMPANY_CONTRACT,
  HOURLY,
  CUSTOMER_CONTRACT,
  PAID_LEAVE,
  DAILY,
} = require('../../../src/helpers/constants');

const sector = {
  _id: new ObjectID(),
  name: 'Etoile',
  company: authCompany._id,
};

const auxiliary = {
  _id: new ObjectID(),
  identity: { firstname: 'Lola', lastname: 'Lili' },
  role: rolesList.find(role => role.name === 'adminClient')._id,
  local: { email: 'toto@alenvi.io', password: '1234567890' },
  refreshToken: uuidv4(),
  company: authCompany._id,
};

const sectorHistory = {
  auxiliary: auxiliary._id,
  sector: sector._id,
  company: authCompany._id,
  startDate: '2018-12-10',
};

const customer = {
  _id: new ObjectID(),
  company: authCompany._id,
  identity: { firstname: 'Lola', lastname: 'Lili' },
  subscriptions: [
    { _id: new ObjectID() },
  ],
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
};

const company = {
  prefixNumber: 103,
  _id: new ObjectID(),
  name: 'Test',
  tradeName: 'TT',
  customersConfig: {
    billingPeriod: 'two_weeks',
  },
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'kjhgfds',
};

const surcharge = {
  _id: new ObjectID(),
  name: 'test',
};

const serviceList = [
  {
    _id: new ObjectID(),
    type: COMPANY_CONTRACT,
    company: authCompany._id,
    versions: [{
      name: 'Service 1',
      surcharge: surcharge._id,
      exemptFromCharges: false,
      startDate: '2019-01-16 17:58:15.519',
      defaultUnitAmount: 24,
    }],
    nature: HOURLY,
  },
  {
    _id: new ObjectID(),
    type: CUSTOMER_CONTRACT,
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 24,
      name: 'Service 2',
      surcharge: surcharge._id,
      exemptFromCharges: false,
      startDate: '2019-01-18 19:58:15.519',
      vat: 12,
    }],
    nature: HOURLY,
  },
];

const customerThirdPartyPayer = {
  _id: new ObjectID(),
  company: authCompany._id,
  isApa: true,
};

const subscriptionId = new ObjectID();

const customersList = [
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
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
    },
    subscriptions: [
      {
        _id: subscriptionId,
        service: serviceList[0]._id,
        versions: [{
          startDate: '2018-01-01T10:00:00.000+01:00',
        }],
      },
      {
        _id: new ObjectID(),
        service: serviceList[1]._id,
        versions: [{
          startDate: '2018-01-05T15:00:00.000+01:00',
        }],
      },
    ],
    fundings: [
      {
        _id: new ObjectID(),
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayer._id,
        subscription: subscriptionId,
        versions: [{
          startDate: '2018-02-03T22:00:00.000+01:00',
        }],
      },
    ],
  },
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
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
    },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    email: 'toototjo@hfjld.io',
    identity: {
      title: 'mr',
      firstname: 'Julian',
      lastname: 'Alaphilippe',
    },
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
  },
];

const thirdPartyPayer = {
  _id: new ObjectID(),
  name: 'Toto',
  company: authCompany._id,
  isApa: true,
};

const eventList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector,
    type: 'absence',
    absence: PAID_LEAVE,
    absenceNature: DAILY,
    startDate: '2019-01-19T14:00:18.653Z',
    endDate: '2019-01-19T17:00:18.653Z',
    auxiliary,
    createdAt: '2019-01-11T08:38:18.653Z',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    sector,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-16T09:30:19.543Z',
    endDate: '2019-01-16T11:30:21.653Z',
    auxiliary,
    customer: customer._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: customer.subscriptions[0]._id,
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
    sector,
    type: 'intervention',
    status: 'contract_with_company',
    startDate: '2019-01-17T14:30:19.543Z',
    endDate: '2019-01-17T16:30:19.543Z',
    auxiliary,
    customer: customer._id,
    createdAt: '2019-01-16T14:30:19.543Z',
    subscription: customer.subscriptions[0]._id,
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
];

const authBillService = {
  serviceId: new ObjectID(),
  name: 'Temps de qualité - autonomie',
  nature: 'fixed',
};

const billsList = [
  {
    _id: new ObjectID(),
    date: '2019-05-29',
    number: 'FACT-1905002',
    company: authCompany._id,
    customer: customer._id,
    client: thirdPartyPayer._id,
    netInclTaxes: 75.96,
    subscriptions: [{
      startDate: '2019-05-29',
      endDate: '2019-11-29',
      subscription: customer.subscriptions[0]._id,
      vat: 5.5,
      service: authBillService,
      events: [{
        eventId: new ObjectID(),
        startDate: '2019-01-16T09:30:19.543Z',
        endDate: '2019-01-16T11:30:21.653Z',
        auxiliary: new ObjectID(),
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
  },
  {
    _id: new ObjectID(),
    date: '2019-05-25',
    number: 'FACT-1905003',
    company: authCompany._id,
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
        inclTaxesCustomer: 12,
        exclTaxesCustomer: 10,
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

const paymentsList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
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
    company: authCompany._id,
    number: 'REG-1903202',
    date: '2019-05-24T15:47:42',
    customer: customer._id,
    netInclTaxes: 390,
    nature: PAYMENT,
    type: 'check',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
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
    company: authCompany._id,
    additionalHours: 0,
    auxiliary,
    bonus: 0,
    contractHours: 151,
    diff: {
      hoursBalance: 8,
      notSurchargedAndNotExempt: 2,
      notSurchargedAndExempt: 2,
      surchargedAndExempt: 2,
      surchargedAndExemptDetails: [],
      surchargedAndNotExempt: 2,
      surchargedAndNotExemptDetails: [],
      workedHours: 0,
      paidTransportHours: 3,
      internalHours: 9,
      absencesHours: 5,
    },
    endDate: '2019-01-31T14:00:18',
    hoursBalance: -8,
    hoursCounter: -20,
    hoursToWork: 30,
    holidaysHours: 12,
    notSurchargedAndExempt: 97,
    notSurchargedAndNotExempt: 43,
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    month: '01-2019',
    mutual: false,
    otherFees: 0,
    overtimeHours: 0,
    startDate: '2019-01-01T14:00:18',
    transport: 10,
    workedHours: 143,
    paidTransportHours: 3,
    internalHours: 9,
    absencesHours: 5,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    additionalHours: 0,
    auxiliary,
    bonus: 0,
    contractHours: 151,
    diff: {
      hoursBalance: 8,
      notSurchargedAndNotExempt: 2,
      notSurchargedAndExempt: 2,
      surchargedAndExempt: 2,
      surchargedAndExemptDetails: [],
      surchargedAndNotExempt: 2,
      surchargedAndNotExemptDetails: [],
      workedHours: 0,
      paidTransportHours: 3,
      internalHours: 9,
      absencesHours: 5,
    },
    endDate: '2019-02-28T14:00:18',
    holidaysHours: 12,
    hoursBalance: -8,
    hoursCounter: -20,
    hoursToWork: 20,
    month: '02-2019',
    mutual: false,
    notSurchargedAndExempt: 97,
    notSurchargedAndNotExempt: 43,
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    otherFees: 0,
    overtimeHours: 0,
    startDate: '2019-01-01T14:00:18',
    transport: 10,
    workedHours: 143,
    paidTransportHours: 3,
    internalHours: 9,
    absencesHours: 5,
  },
];

const finalPayList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    additionalHours: 0,
    auxiliary,
    bonus: 0,
    compensation: 10,
    contractHours: 151,
    diff: {
      hoursBalance: 8,
      notSurchargedAndNotExempt: 2,
      notSurchargedAndExempt: 2,
      surchargedAndExempt: 2,
      surchargedAndExemptDetails: [],
      surchargedAndNotExempt: 2,
      surchargedAndNotExemptDetails: [],
      workedHours: 0,
      paidTransportHours: 3,
      internalHours: 9,
      absencesHours: 5,
    },
    endDate: '2019-01-31T14:00:18',
    endNotificationDate: '2019-01-25T14:00:18',
    endReason: 'salut',
    holidaysHours: 12,
    hoursBalance: -8,
    hoursCounter: -20,
    hoursToWork: 20,
    month: '01-2019',
    mutual: false,
    notSurchargedAndExempt: 97,
    notSurchargedAndNotExempt: 43,
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    overtimeHours: 0,
    otherFees: 0,
    startDate: '2019-01-01T14:00:18',
    transport: 10,
    workedHours: 143,
    paidTransportHours: 3,
    internalHours: 9,
    absencesHours: 5,
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    additionalHours: 0,
    auxiliary,
    bonus: 0,
    compensation: 10,
    contractHours: 151,
    diff: {
      hoursBalance: 8,
      notSurchargedAndNotExempt: 2,
      notSurchargedAndExempt: 2,
      surchargedAndExempt: 2,
      surchargedAndExemptDetails: [],
      surchargedAndNotExempt: 2,
      surchargedAndNotExemptDetails: [],
      workedHours: 0,
      paidTransportHours: 3,
      internalHours: 9,
      absencesHours: 5,
    },
    endDate: '2019-02-28T14:00:18',
    endNotificationDate: '2019-02-25T14:00:18',
    endReason: 'salut',
    holidaysHours: 12,
    hoursBalance: -8,
    hoursCounter: -20,
    hoursToWork: 20,
    month: '02-2019',
    mutual: false,
    notSurchargedAndExempt: 97,
    notSurchargedAndNotExempt: 43,
    otherFees: 0,
    overtimeHours: 0,
    startDate: '2019-01-01T14:00:18',
    surchargedAndExempt: 0,
    surchargedAndExemptDetails: [],
    surchargedAndNotExempt: 3,
    surchargedAndNotExemptDetails: [],
    transport: 10,
    workedHours: 143,
    paidTransportHours: 3,
    internalHours: 9,
    absencesHours: 5,
  },
];

const creditNotesList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    date: '2019-05-28',
    startDate: '2019-05-27',
    endDate: '2019-11-25',
    customer: customer._id,
    thirdPartyPayer: customerThirdPartyPayer._id,
    exclTaxesCustomer: 100,
    inclTaxesCustomer: 112,
    exclTaxesTpp: 10,
    inclTaxesTpp: 90,
    events: [{
      eventId: new ObjectID(),
      serviceName: 'Temps de qualité - autonomie',
      startDate: '2019-01-16T10:30:19.543Z',
      endDate: '2019-01-16T12:30:21.653Z',
      auxiliary: new ObjectID(),
      bills: {
        inclTaxesCustomer: 10,
        exclTaxesCustomer: 8,
      },
    }],
    origin: 'compani',
    subscription: {
      _id: customer.subscriptions[0]._id,
      service: {
        serviceId: new ObjectID(),
        nature: 'fixed',
        name: 'toto',
      },
      vat: 5.5,
    },
  },
];

const user = {
  _id: new ObjectID(),
  identity: { firstname: 'test', lastname: 'Toto' },
  local: { email: 'toto@alenvi.io', password: '123456' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'helper')._id,
  company: authCompany._id,
  customers: [customer._id],
};

const populateEvents = async () => {
  await Event.deleteMany();
  await User.deleteMany();
  await Customer.deleteMany();
  await Sector.deleteMany();
  await SectorHistory.deleteMany();

  await populateDBForAuthentication();
  await Event.insertMany(eventList);
  await new User(auxiliary).save();
  await new Sector(sector).save();
  await new SectorHistory(sectorHistory).save();
  await new Customer(customer).save();
};

const populateSectorHistories = async () => {
  await User.deleteMany();
  await Sector.deleteMany();
  await SectorHistory.deleteMany();

  await populateDBForAuthentication();
  await new User(auxiliary).save();
  await new Sector(sector).save();
  await new SectorHistory(sectorHistory).save();
};

const populateBillsAndCreditNotes = async () => {
  await Bill.deleteMany();
  await Customer.deleteMany();
  await ThirdPartyPayer.deleteMany();
  await CreditNote.deleteMany();

  await populateDBForAuthentication();
  await Bill.insertMany(billsList);
  await CreditNote.insertMany(creditNotesList);
  await new Customer(customer).save();
  await new ThirdPartyPayer(thirdPartyPayer).save();
};

const populatePayment = async () => {
  await Payment.deleteMany();
  await Customer.deleteMany();
  await ThirdPartyPayer.deleteMany();

  await populateDBForAuthentication();
  await Payment.insertMany(paymentsList);
  await new Customer(customer).save();
  await new ThirdPartyPayer(thirdPartyPayer).save();
};

const populateService = async () => {
  await Service.deleteMany();
  await Company.deleteMany();

  await populateDBForAuthentication();
  await (new Company(company)).save();
  await Service.insertMany(serviceList);
};

const populateCustomer = async () => {
  await Customer.deleteMany();
  await ThirdPartyPayer.deleteMany();
  await Service.deleteMany();
  await Company.deleteMany();

  await populateDBForAuthentication();
  await (new Company(company)).save();
  await (new ThirdPartyPayer(customerThirdPartyPayer)).save();
  await Service.insertMany(serviceList);
  await Customer.insertMany(customersList);
};

const populateUser = async () => {
  await User.deleteMany();
  await Customer.deleteMany();
  await populateDBForAuthentication();
  await (new User(user)).save();
  await (new Customer(customer)).save();
};

const populatePay = async () => {
  await Pay.deleteMany();
  await FinalPay.deleteMany();
  await User.deleteMany();

  await populateDBForAuthentication();
  await Pay.insertMany(payList);
  await FinalPay.insertMany(finalPayList);
  await new User(auxiliary).save();
};

module.exports = {
  populateEvents,
  populateBillsAndCreditNotes,
  populatePayment,
  populatePay,
  paymentsList,
  populateService,
  populateCustomer,
  populateUser,
  populateSectorHistories,
};
