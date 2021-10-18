const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Repetition = require('../../../src/models/Repetition');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const User = require('../../../src/models/User');
const Bill = require('../../../src/models/Bill');
const Payment = require('../../../src/models/Payment');
const CreditNote = require('../../../src/models/CreditNote');
const TaxCertificate = require('../../../src/models/TaxCertificate');
const Helper = require('../../../src/models/Helper');
const UserCompany = require('../../../src/models/UserCompany');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const { FIXED, ONCE, HOURLY, WEBAPP, DEATH, QUALITY, EVERY_WEEK } = require('../../../src/helpers/constants');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { auxiliaryRoleId, helperRoleId, clientAdminRoleId } = require('../../seed/authRolesSeed');

const subId1 = new ObjectID();
const subId2 = new ObjectID();
const subId3 = new ObjectID();
const subId4 = new ObjectID();
const subId5 = new ObjectID();
const service1 = new ObjectID();
const service2 = new ObjectID();
const service3 = new ObjectID();
const service4 = new ObjectID();
const archivedService = new ObjectID();
const otherCompanyCustomerId = new ObjectID();

const referentList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'Referent', lastname: 'Test', title: 'mr' },
    local: { email: 'auxiliaryreferent@alenvi.io' },
    contact: { phone: '0987654321' },
    picture: { publicId: '1234', link: 'test' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'SuperReferent', lastname: 'Test', title: 'mr' },
    local: { email: 'auxiliaryreferent2@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    origin: WEBAPP,
  },
];

const customerServiceList = [
  {
    _id: service1,
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 1',
      startDate: '2019-01-16T17:58:15',
      vat: 12,
      exemptFromCharges: false,
    }],
    nature: HOURLY,
  },
  {
    _id: service2,
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 24,
      exemptFromCharges: false,
      name: 'Service 2',
      startDate: '2019-01-18T12:58:15',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: service3,
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 36,
      exemptFromCharges: false,
      name: 'Service 3',
      startDate: '2019-04-18T19:58:15',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: service4,
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 48,
      exemptFromCharges: false,
      name: 'Service 4',
      startDate: '2019-06-18T14:58:15',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: archivedService,
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      exemptFromCharges: false,
      name: 'Service archivé',
      startDate: '2019-01-18T19:58:15',
      vat: 1,
    }],
    nature: HOURLY,
    isArchived: true,
  },
];

const customerThirdPartyPayers = [
  { _id: new ObjectID(), company: authCompany._id, isApa: true, billingMode: 'direct', name: 'Toto' },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
    name: 'Toto',
    teletransmissionId: '12345',
  },
];

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
      { // no link
        _id: subId1,
        service: service1,
        versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
      },
      {
        _id: subId3, // linked to funding (no repetition, no funding)
        service: service2,
        versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
      },
      {
        _id: subId4, // linked to repetition (no event, no funding)
        service: service3,
        versions: [{ unitTTCRate: 14, estimatedWeeklyVolume: 16, evenings: 3, sundays: 4 }],
      },
      {
        _id: subId5, // linked to event (no repetition, no funding)
        service: service4,
        versions: [{ unitTTCRate: 20, estimatedWeeklyVolume: 21, evenings: 4, sundays: 5 }],
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
          subscriptionId: subId1,
        },
        {
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          service: 'Service 2',
          subscriptionId: subId3,
        },
        {
          unitTTCRate: 14,
          estimatedWeeklyVolume: 16,
          evenings: 3,
          sundays: 4,
          service: 'Service 3',
          subscriptionId: subId4,
        },
        {
          unitTTCRate: 20,
          estimatedWeeklyVolume: 21,
          evenings: 4,
          sundays: 5,
          service: 'Service 3',
          subscriptionId: subId5,
        },
      ],
      helper: { firstname: 'Vladimir', lastname: 'Poutine', title: 'mr' },
      approvalDate: '2018-01-01T10:00:00.000+01:00',
    }],
    payment: { bankAccountOwner: 'David gaudu', mandates: [{ rum: 'R012345678903456789' }] },
    quotes: [{
      _id: new ObjectID(),
      subscriptions: [
        { service: { name: 'Test', nature: 'hourly' }, unitTTCRate: 23, estimatedWeeklyVolume: 3 },
        { service: { name: 'Test2', nature: 'hourly' }, unitTTCRate: 30, estimatedWeeklyVolume: 10 },
      ],
    }],
    fundings: [
      {
        _id: new ObjectID(),
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayers[1]._id,
        subscription: subId3,
        fundingPlanId: '12345',
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
      {
        _id: new ObjectID(),
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayers[1]._id,
        subscription: subId3,
        fundingPlanId: '04124',
        versions: [{
          folderNumber: 'D123457',
          startDate: moment.utc().toDate(),
          frequency: ONCE,
          endDate: moment.utc().add(5, 'months').toDate(),
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
      service: archivedService,
      versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 12, evenings: 2, sundays: 1 }],
    }],
    fundings: [{
      _id: new ObjectID(),
      nature: FIXED,
      thirdPartyPayer: customerThirdPartyPayers[0]._id,
      subscription: subId3,
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
  { // 2
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
  { // 3
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
  // 4 - customer with bill
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withBills', lastname: 'customer' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectID(),
      service: service1,
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
  // 5 - customer with payment
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withPayments', lastname: 'customer' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectID(),
      service: service1,
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
  // 6 - customer with creditNote
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withCreditNote', lastname: 'customer' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectID(),
      service: service1,
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
  // 7 - customer with taxcertificate
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withBills', lastname: 'customer' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectID(),
      service: service1,
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
  { // 8 - Helper's customer
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
      service: service1,
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
        thirdPartyPayer: customerThirdPartyPayers[0]._id,
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
  { // 9 - stopped with billed events
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
    },
    stoppedAt: '2020-06-01T23:00:00',
    stopReason: DEATH,
  },
  { // 10
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
    },
    createdAt: new Date('2021-05-24'),
  },
  { // 11
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'alex', lastname: 'terieur' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    stoppedAt: new Date(),
    stopReason: DEATH,
    archivedAt: new Date(),
  },
  { // 12
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'testons', lastname: 'larchivage' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    stoppedAt: new Date(),
    stopReason: DEATH,
  },
  { // 13 - stopped with non billed, to invoice events
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'agathe', lastname: 'thepower' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    stoppedAt: '2020-06-01T23:00:00',
    stopReason: QUALITY,
  },
  // 14 - customer with bill and archived
  {
    _id: new ObjectID(),
    company: authCompany._id,
    stoppedAt: '2021-06-01T23:00:00',
    stopReason: QUALITY,
    archivedAt: '2021-07-01T23:00:00',
    identity: { title: 'mr', firstname: 'Baltazar', lastname: 'ChivedWithBills' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: subId1,
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
  { // 15 - stopped with non billed, not to invoice events
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'agathe', lastname: 'thepower' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    stoppedAt: '2020-06-01T23:00:00',
    stopReason: QUALITY,
  },
];

const billList = [
  {
    _id: new ObjectID(),
    type: 'automatic',
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
        startDate: '2019-01-16T09:30:19',
        endDate: '2019-01-16T11:30:21',
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
  },
  {
    _id: new ObjectID(),
    type: 'automatic',
    company: customersList[14].company,
    number: 'FACT-1901002',
    date: '2019-05-29',
    customer: customersList[14]._id,
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
        startDate: '2019-01-16T09:30:19',
        endDate: '2019-01-16T11:30:21',
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
  },
];

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
      service: service1,
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
      }],
    },
    {
      _id: new ObjectID(),
      service: service2,
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
      service: { name: 'Test', nature: 'hourly' },
      unitTTCRate: 23,
      estimatedWeeklyVolume: 3,
    }, {
      service: { name: 'Test2', nature: 'hourly' },
      unitTTCRate: 30,
      estimatedWeeklyVolume: 10,
    }],
  }],
  fundings: [
    {
      _id: new ObjectID(),
      nature: FIXED,
      thirdPartyPayer: customerThirdPartyPayers[0]._id,
      subscription: subId3,
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
    identity: { firstname: 'HelperForCustomer', lastname: 'TheEtMoselle' },
    local: { email: 'helper_for_customer_customer@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'HelperForCustomer2', lastname: 'Rtre' },
    local: { email: 'helper_for_customer_customer2@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'HelperForCustomer4', lastname: 'Life' },
    local: { email: 'helper_for_customer_customer4@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'HelperForCustomerOtherCompany', lastname: 'Caragua' },
    local: { email: 'helper_for_customer_other_company@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'AdminForOtherCompany', lastname: 'Test' },
    local: { email: 'admin_for_other_company@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: clientAdminRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'Devo' },
    local: { email: 'auxforevent@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectID(),
    identity: { firstname: 'Auxiliary', lastname: 'Vé' },
    local: { email: 'auxforcustomer@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    origin: WEBAPP,
  },
];

const sectorsList = [
  { _id: new ObjectID(), name: 'Super Equipe', company: authCompany._id },
  { _id: new ObjectID(), name: 'Equipe Genial', company: authCompany._id },
];

const sectorHistoriesList = [
  { sector: sectorsList[0]._id, auxiliary: userList[5], company: authCompany._id, startDate: '2019-01-01T00:00:00' },
  { sector: sectorsList[1]._id, auxiliary: userList[6], company: authCompany._id, startDate: '2019-01-01T00:00:00' },
];

const eventList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    isBilled: true,
    customer: customersList[0]._id,
    type: 'intervention',
    sector: sectorsList[0]._id,
    subscription: subId5,
    startDate: '2019-01-16T14:30:19',
    endDate: '2019-01-16T15:30:21',
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
    isBilled: true,
    customer: customersList[14]._id,
    type: 'intervention',
    sector: new ObjectID(),
    subscription: subId5,
    startDate: '2019-01-16T14:30:19',
    endDate: '2019-01-16T15:30:21',
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
    sector: new ObjectID(),
    subscription: subId5,
    startDate: '2019-01-17T14:30:19',
    endDate: '2019-01-17T15:30:21',
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
    startDate: '2020-12-14T09:30:19',
    endDate: '2020-12-14T11:30:21',
    customer: customersList[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: subId5,
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
    startDate: '2019-01-16T09:30:19',
    endDate: '2019-01-16T11:30:21',
    customer: customersList[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: subId5,
    isBilled: true,
    bills: {
      thirdPartyPayer: customerThirdPartyPayers[0]._id,
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
    sector: sectorsList[1]._id,
    subscription: new ObjectID(),
    startDate: '2019-01-16T14:30:19',
    endDate: '2019-01-16T15:30:21',
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
    customer: customersList[1]._id,
    auxiliary: userList[5]._id,
    type: 'intervention',
    subscription: new ObjectID(),
    startDate: '2019-01-16T14:30:19',
    endDate: '2019-01-16T15:30:21',
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
    customer: customersList[2]._id,
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectID(),
    startDate: '2019-01-16T14:30:19',
    endDate: '2019-01-16T15:30:21',
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
    customer: customersList[12]._id,
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectID(),
    startDate: '2019-01-16T14:30:19',
    endDate: '2019-01-16T15:30:21',
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
    customer: customersList[9]._id,
    isBilled: true,
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectID(),
    startDate: '2019-01-16T14:30:19',
    endDate: '2019-01-16T15:30:21',
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
    customer: customersList[13]._id,
    isBilled: false,
    isCancelled: true,
    cancel: { reason: 'auxiliary_initiative', condition: 'invoiced_and_not_paid' },
    misc: 'skusku',
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectID(),
    startDate: '2019-01-16T14:30:19',
    endDate: '2019-01-16T15:30:21',
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
    customer: customersList[15]._id,
    isBilled: false,
    isCancelled: true,
    cancel: { reason: 'auxiliary_initiative', condition: 'not_invoiced_and_not_paid' },
    misc: 'skusku',
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectID(),
    startDate: '2019-01-16T14:30:19',
    endDate: '2019-01-16T15:30:21',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
];

const repetitionParentId = new ObjectID();
const repetition = {
  _id: new ObjectID(),
  parentId: repetitionParentId,
  subscription: subId4,
  repetition: { frequency: EVERY_WEEK },
  company: authCompany._id,
};

const helpersList = [
  { customer: customersList[0]._id, user: userList[0]._id, company: authCompany._id, referent: true },
  { customer: customersList[1]._id, user: userList[1]._id, company: authCompany._id, referent: true },
  { customer: customersList[4]._id, user: userList[2]._id, company: authCompany._id, referent: true },
  { customer: otherCompanyCustomerId, user: userList[3]._id, company: otherCompany._id, referent: true },
];

const userCompanies = [
  { _id: new ObjectID(), user: referentList[0]._id, company: authCompany._id },
  { _id: new ObjectID(), user: referentList[1]._id, company: authCompany._id },
  { _id: new ObjectID(), user: userList[0]._id, company: authCompany._id },
  { _id: new ObjectID(), user: userList[1]._id, company: authCompany._id },
  { _id: new ObjectID(), user: userList[2]._id, company: authCompany._id },
  { _id: new ObjectID(), user: userList[3]._id, company: otherCompany._id },
  { _id: new ObjectID(), user: userList[4]._id, company: otherCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Bill.create(billList),
    CreditNote.create(creditNote),
    Customer.create([...customersList, otherCompanyCustomer]),
    Event.create(eventList),
    Helper.create(helpersList),
    Payment.create(payment),
    ReferentHistory.create(referentHistories),
    Repetition.create(repetition),
    Sector.create(sectorsList),
    SectorHistory.create(sectorHistoriesList),
    Service.create(customerServiceList),
    TaxCertificate.create(taxCertificate),
    ThirdPartyPayer.create(customerThirdPartyPayers),
    User.create([...userList, ...referentList]),
    UserCompany.create(userCompanies),
  ]);
};

module.exports = {
  customersList,
  userList,
  populateDB,
  archivedService,
  service2,
  customerThirdPartyPayers,
  otherCompanyCustomer,
  sectorsList,
};
