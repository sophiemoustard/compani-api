const { ObjectID } = require('mongodb');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const CreditNote = require('../../../src/models/CreditNote');
const Customer = require('../../../src/models/Customer');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const Service = require('../../../src/models/Service');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const CreditNoteNumber = require('../../../src/models/CreditNoteNumber');
const Helper = require('../../../src/models/Helper');
const { HOURLY, WEBAPP } = require('../../../src/helpers/constants');
const { populateDBForAuthentication, rolesList, authCompany, otherCompany } = require('./authenticationSeed');
const UserCompany = require('../../../src/models/UserCompany');

const creditNoteThirdPartyPayer = {
  _id: new ObjectID(),
  name: 'Toto',
  company: authCompany._id,
  isApa: true,
  billingMode: 'direct',
};

const creditNoteService = {
  _id: new ObjectID(),
  company: authCompany._id,
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    startDate: '2019-01-16 17:58:15.519',
    vat: 12,
    exemptFromCharges: false,
  }],
  nature: HOURLY,
};

const creditNoteCustomer = {
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
  },
  payment: {
    bankAccountOwner: 'Lance Amstrong',
    iban: 'FR3514508000505917721779B12',
    bic: 'BNMDHISOBD',
    mandates: [{ rum: 'R09876543456765432', _id: new ObjectID(), signedAt: moment().toDate() }],
  },
  subscriptions: [
    {
      _id: new ObjectID(),
      service: creditNoteService._id,
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    },
  ],
};

const creditNoteUserList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'HelperForCustomer', lastname: 'Test' },
    local: { email: 'helper_for_customer_creditnote@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'helper')._id },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Tata', lastname: 'Toto' },
    local: { email: 'toto@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
    origin: WEBAPP,
  },
];

const creditNoteEvent = {
  _id: new ObjectID(),
  company: authCompany._id,
  sector: new ObjectID(),
  type: 'intervention',
  startDate: '2019-01-16T09:30:19.543Z',
  endDate: '2019-01-16T11:30:21.653Z',
  auxiliary: creditNoteUserList[1]._id,
  customer: creditNoteCustomer._id,
  createdAt: '2019-01-15T11:33:14.343Z',
  subscription: creditNoteCustomer.subscriptions[0]._id,
  isBilled: true,
  bills: {
    thirdPartyPayer: creditNoteThirdPartyPayer._id,
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
  origin: 'compani',
};

const creditNotesList = [
  {
    _id: new ObjectID(),
    date: moment().toDate(),
    startDate: moment().startOf('month').toDate(),
    endDate: moment().set('date', 15).toDate(),
    customer: creditNoteCustomer._id,
    exclTaxesCustomer: 100,
    inclTaxesCustomer: 112,
    events: [{
      eventId: creditNoteEvent._id,
      auxiliary: creditNoteEvent.auxiliary,
      startDate: creditNoteEvent.startDate,
      endDate: creditNoteEvent.endDate,
      serviceName: 'toto',
      bills: { inclTaxesCustomer: 10, exclTaxesCustomer: 8 },
    }],
    subscription: {
      _id: creditNoteCustomer.subscriptions[0]._id,
      service: { serviceId: creditNoteService._id, nature: 'fixed', name: 'toto' },
      vat: 5.5,
    },
    origin: 'compani',
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    date: moment().toDate(),
    startDate: moment().startOf('month').toDate(),
    endDate: moment().set('date', 15).toDate(),
    customer: creditNoteCustomer._id,
    exclTaxesCustomer: 100,
    inclTaxesCustomer: 112,
    events: [{
      eventId: creditNoteEvent._id,
      auxiliary: creditNoteEvent.auxiliary,
      startDate: creditNoteEvent.startDate,
      endDate: creditNoteEvent.endDate,
      serviceName: 'toto',
      bills: {
        inclTaxesCustomer: 10,
        exclTaxesCustomer: 8,
      },
    }],
    subscription: {
      _id: creditNoteCustomer.subscriptions[0]._id,
      service: { serviceId: creditNoteService._id, nature: 'fixed', name: 'toto' },
      vat: 5.5,
    },
    origin: 'ogust',
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    date: '2020-01-01',
    startDate: '2020-01-01',
    endDate: '2020-01-12',
    customer: creditNoteCustomer._id,
    exclTaxesCustomer: 100,
    inclTaxesCustomer: 112,
    events: [{
      eventId: creditNoteEvent._id,
      auxiliary: creditNoteEvent.auxiliary,
      startDate: creditNoteEvent.startDate,
      endDate: creditNoteEvent.endDate,
      serviceName: 'toto',
      bills: { inclTaxesCustomer: 10, exclTaxesCustomer: 8 },
    }],
    subscription: {
      _id: creditNoteCustomer.subscriptions[0]._id,
      service: { serviceId: creditNoteService._id, nature: 'fixed', name: 'toto' },
      vat: 5.5,
    },
    isEditable: false,
    origin: 'ogust',
    company: authCompany._id,
  },
];

const otherCompanyThirdPartyPayer = {
  _id: new ObjectID(),
  name: 'Titi',
  company: otherCompany._id,
  isApa: false,
  billingMode: 'direct',
};

const otherCompanyService = {
  _id: new ObjectID(),
  company: otherCompany._id,
  versions: [{
    defaultUnitAmount: 24,
    name: 'Service 2',
    startDate: '2019-01-16 17:58:15.519',
    vat: 5.5,
    exemptFromCharges: false,
  }],
  nature: HOURLY,
};

const otherCompanyCustomer = {
  _id: new ObjectID(),
  company: otherCompany._id,
  identity: { title: 'mr', firstname: 'Jean', lastname: 'Bonbeurre' },
  contact: {
    primaryAddress: {
      fullAddress: '23 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '23 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0623675432',
  },
  payment: {
    bankAccountOwner: 'Jean Bonbeurre',
    iban: 'FR9514708000505917721779B13',
    bic: 'AGMDHISOBD',
    mandates: [{ rum: 'R19879533456767438', _id: new ObjectID(), signedAt: moment().toDate() }],
  },
  subscriptions: [{
    _id: new ObjectID(),
    service: otherCompanyService._id,
    versions: [{
      unitTTCRate: 24,
      estimatedWeeklyVolume: 6,
      evenings: 0,
      sundays: 1,
      startDate: '2018-01-01T10:00:00.000+01:00',
    }],
  }],
};

const otherCompanyUser = {
  _id: new ObjectID(),
  identity: { firstname: 'Renégat', lastname: 'Toto' },
  local: { email: 'other_user@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'client_admin')._id },
  origin: WEBAPP,
};

const otherCompanyEvent = {
  _id: new ObjectID(),
  company: otherCompany._id,
  sector: new ObjectID(),
  type: 'intervention',
  startDate: '2019-01-16T09:30:19.543Z',
  endDate: '2019-01-16T11:30:21.653Z',
  auxiliary: new ObjectID(),
  customer: otherCompanyCustomer._id,
  createdAt: '2019-01-15T11:33:14.343Z',
  subscription: otherCompanyCustomer.subscriptions[0]._id,
  isBilled: true,
  address: {
    fullAddress: '37 rue de ponthieu 75008 Paris',
    zipCode: '75008',
    city: 'Paris',
    street: '37 rue de Ponthieu',
    location: { type: 'Point', coordinates: [2.377133, 48.801389] },
  },
  bills: {
    thirdPartyPayer: otherCompanyThirdPartyPayer._id,
    inclTaxesCustomer: 20,
    exclTaxesCustomer: 15,
    inclTaxesTpp: 10,
    exclTaxesTpp: 5,
    fundingId: new ObjectID(),
    nature: 'hourly',
    careHours: 2,
  },
  origin: 'compani',
};

const otherCompanyCreditNote = {
  _id: new ObjectID(),
  date: moment().toDate(),
  startDate: moment().startOf('month').toDate(),
  endDate: moment().set('date', 15).toDate(),
  customer: otherCompanyCustomer._id,
  exclTaxesCustomer: 100,
  inclTaxesCustomer: 112,
  events: [{
    eventId: otherCompanyEvent._id,
    auxiliary: new ObjectID(),
    startDate: otherCompanyEvent.startDate,
    endDate: otherCompanyEvent.endDate,
    serviceName: 'titi',
    bills: { inclTaxesCustomer: 10, exclTaxesCustomer: 8 },
  }],
  subscription: {
    _id: otherCompanyCustomer.subscriptions[0]._id,
    service: { serviceId: otherCompanyService._id, nature: 'fixed', name: 'toto' },
    vat: 5.5,
  },
  origin: 'compani',
  company: otherCompany._id,
};

const helpersList = [{
  customer: creditNoteCustomer._id,
  user: creditNoteUserList[0]._id,
  company: authCompany._id,
  referent: true,
}];

const userCompanies = [
  { _id: new ObjectID(), user: creditNoteUserList[0]._id, company: authCompany._id },
  { _id: new ObjectID(), user: creditNoteUserList[1]._id, company: authCompany._id },
  { _id: new ObjectID(), user: otherCompanyUser._id, company: otherCompany._id },
];

const populateDB = async () => {
  await CreditNote.deleteMany();
  await Event.deleteMany();
  await Customer.deleteMany();
  await Service.deleteMany();
  await CreditNoteNumber.deleteMany();
  await User.deleteMany();
  await ThirdPartyPayer.deleteMany();
  await Helper.deleteMany();
  await UserCompany.deleteMany();

  await populateDBForAuthentication();
  await Event.create([creditNoteEvent, otherCompanyEvent]);
  await Customer.create([creditNoteCustomer, otherCompanyCustomer]);
  await Service.create([creditNoteService, otherCompanyService]);
  await ThirdPartyPayer.create([creditNoteThirdPartyPayer, otherCompanyThirdPartyPayer]);
  await CreditNote.insertMany([...creditNotesList, otherCompanyCreditNote]);
  await User.create([...creditNoteUserList, otherCompanyUser]);
  await Helper.insertMany(helpersList);
  await UserCompany.insertMany(userCompanies);
};

module.exports = {
  creditNotesList,
  populateDB,
  creditNoteCustomer,
  creditNoteEvent,
  creditNoteUserList,
  creditNoteThirdPartyPayer,
  otherCompanyCustomer,
  otherCompanyThirdPartyPayer,
  otherCompanyEvent,
  otherCompanyUser,
  otherCompanyCreditNote,
};
