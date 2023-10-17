const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Customer = require('../../../src/models/Customer');
const CustomerAbsence = require('../../../src/models/CustomerAbsence');
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
const EventHistory = require('../../../src/models/EventHistory');
const Sector = require('../../../src/models/Sector');
const SectorHistory = require('../../../src/models/SectorHistory');
const {
  FIXED,
  ONCE,
  HOURLY,
  WEBAPP,
  DEATH,
  QUALITY,
  EVERY_WEEK,
  HOSPITALIZATION,
} = require('../../../src/helpers/constants');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { auxiliaryRoleId, helperRoleId, clientAdminRoleId } = require('../../seed/authRolesSeed');
const CustomerPartner = require('../../../src/models/CustomerPartner');
const Partner = require('../../../src/models/Partner');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');

const subIdList = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
const serviceIdList = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];

const archivedService = new ObjectId();
const otherCompanyCustomerId = new ObjectId();

const referentList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'Referent', lastname: 'Test', title: 'mr' },
    local: { email: 'auxiliaryreferent@alenvi.io' },
    contact: { phone: '0987654321' },
    picture: { publicId: '1234', link: 'test' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'SuperReferent', lastname: 'Test', title: 'mr' },
    local: { email: 'auxiliaryreferent2@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    origin: WEBAPP,
  },
];

const customerServiceList = [
  {
    _id: serviceIdList[0],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 1',
      startDate: '2019-01-16T17:58:15.000Z',
      vat: 12,
      exemptFromCharges: false,
    }],
    nature: HOURLY,
  },
  {
    _id: serviceIdList[1],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 24,
      exemptFromCharges: false,
      name: 'Service 2',
      startDate: '2019-01-18T12:58:15.000Z',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: serviceIdList[2],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 36,
      exemptFromCharges: false,
      name: 'Service 3',
      startDate: '2019-04-18T19:58:15.000Z',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: serviceIdList[3],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 48,
      exemptFromCharges: false,
      name: 'Service 4',
      startDate: '2019-06-18T14:58:15.000Z',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: serviceIdList[4],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 150,
      exemptFromCharges: false,
      name: 'Service 5',
      startDate: '2019-06-18T14:58:15.000Z',
      vat: 12,
    }],
    nature: FIXED,
  },
  {
    _id: archivedService,
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      exemptFromCharges: false,
      name: 'Service archivé',
      startDate: '2019-01-18T19:58:15.000Z',
      vat: 1,
    }],
    nature: HOURLY,
    isArchived: true,
  },
  {
    _id: serviceIdList[5],
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      exemptFromCharges: false,
      name: 'Service avec articles de facturation',
      startDate: '2019-01-18T19:58:15.000Z',
      vat: 1,
      billingItems: [new ObjectId()],
    }],
    nature: HOURLY,
  },
];

const customerThirdPartyPayers = [
  { _id: new ObjectId(), company: authCompany._id, isApa: true, billingMode: 'direct', name: 'Toto' },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
    name: 'Tata',
    teletransmissionId: '12345',
  },
];

const customersList = [
  { // Customer with subscriptions, subscriptionsHistory, fundings and quote
    _id: new ObjectId(),
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
        _id: subIdList[0],
        service: serviceIdList[0],
        versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, saturdays: 2, sundays: 1 }],
      },
      {
        _id: subIdList[2], // linked to funding (no repetition, no funding)
        service: serviceIdList[1],
        versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, saturdays: 2, sundays: 1 }],
      },
      {
        _id: subIdList[3], // linked to repetition (no event, no funding)
        service: serviceIdList[2],
        versions: [{ unitTTCRate: 14, weeklyHours: 16, evenings: 3, saturdays: 2, sundays: 4 }],
      },
      {
        _id: subIdList[4], // linked to event (no repetition, no funding)
        service: serviceIdList[3],
        versions: [{ unitTTCRate: 20, weeklyHours: 21, evenings: 4, saturdays: 2, sundays: 5 }],
      },
      {
        _id: subIdList[5], // hourly service with billing items
        service: serviceIdList[5],
        versions: [{ unitTTCRate: 20, weeklyHours: 21, weeklyCount: 12, evenings: 4, saturdays: 2, sundays: 5 }],
      },
    ],
    subscriptionsHistory: [{
      subscriptions: [
        {
          unitTTCRate: 12,
          weeklyHours: 12,
          evenings: 2,
          sundays: 1,
          service: 'Service 1',
          subscriptionId: subIdList[0],
        },
        {
          unitTTCRate: 12,
          weeklyHours: 12,
          evenings: 2,
          sundays: 1,
          service: 'Service 2',
          subscriptionId: subIdList[2],
        },
        {
          unitTTCRate: 14,
          weeklyHours: 16,
          evenings: 3,
          sundays: 4,
          service: 'Service 3',
          subscriptionId: subIdList[3],
        },
        {
          unitTTCRate: 20,
          weeklyHours: 21,
          evenings: 4,
          sundays: 5,
          service: 'Service 3',
          subscriptionId: subIdList[4],
        },
      ],
      helper: { firstname: 'Vladimir', lastname: 'Poutine', title: 'mr' },
      approvalDate: '2018-01-01T10:00:00.000Z',
    }],
    payment: { bankAccountOwner: 'David gaudu', mandates: [{ rum: 'R012345678903456789' }] },
    quotes: [{
      _id: new ObjectId(),
      subscriptions: [
        { service: { name: 'Test', nature: 'hourly' }, unitTTCRate: 23, weeklyHours: 3 },
        { service: { name: 'Test2', nature: 'hourly' }, unitTTCRate: 30, weeklyHours: 10 },
      ],
    }],
    fundings: [
      {
        _id: new ObjectId(),
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayers[1]._id,
        subscription: subIdList[2],
        frequency: ONCE,
        versions: [{
          fundingPlanId: '12345',
          folderNumber: 'D123456',
          startDate: '2021-10-24T00:00:00.000Z',
          endDate: '2022-04-10T23:59:59.000Z',
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [0, 1, 2, 3, 4, 5, 6],
        }],
      },
      {
        _id: new ObjectId(),
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayers[1]._id,
        subscription: subIdList[2],
        frequency: ONCE,
        versions: [{
          fundingPlanId: '04124',
          folderNumber: 'D123457',
          startDate: '2021-10-24T00:00:00.000Z',
          endDate: '2022-04-10T23:59:59.000Z',
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [0, 1, 2, 3, 4, 5, 6],
        }],
      },
    ],
  },
  { // Customer with mandates
    _id: new ObjectId(),
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
      mandates: [{ rum: 'R09876543456765432', _id: new ObjectId(), signedAt: '2021-10-03T12:35:46.000Z' }],
    },
    subscriptions: [
      {
        _id: new ObjectId(),
        service: archivedService,
        versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
      },
      {
        _id: new ObjectId(),
        service: serviceIdList[4],
        versions: [{ unitTTCRate: 100, weeklyCount: 4 }],
      },
    ],
    fundings: [{
      _id: new ObjectId(),
      nature: FIXED,
      thirdPartyPayer: customerThirdPartyPayers[0]._id,
      subscription: subIdList[2],
      frequency: ONCE,
      versions: [{
        folderNumber: 'D123456',
        startDate: '2022-01-12T00:00:00.000Z',
        endDate: '2022-07-12T23:59:59.000Z',
        amountTTC: 120,
        customerParticipationRate: 10,
        careDays: [0, 1, 2, 3, 4, 5, 6],
      }],
    }],
  },
  { // 2
    _id: new ObjectId(),
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
    _id: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withBills', lastname: 'customer' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectId(),
      service: serviceIdList[0],
      versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
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
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withPayments', lastname: 'Kilian' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectId(),
      service: serviceIdList[0],
      versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
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
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withCreditNote', lastname: 'Antoine' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectId(),
      service: serviceIdList[0],
      versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
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
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'withBills', lastname: 'Hugo' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: new ObjectId(),
      service: serviceIdList[0],
      versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
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
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Romain', lastname: 'Duris' },
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
      _id: subIdList[1],
      service: serviceIdList[0],
      versions: [
        { unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1, createdAt: '2020-01-01T23:00:00.000Z' },
        { unitTTCRate: 10, weeklyHours: 8, evenings: 0, sundays: 2, createdAt: '2019-06-01T23:00:00.000Z' },
      ],
    }],
    subscriptionsHistory: [],
    payment: { bankAccountOwner: 'David gaudu', mandates: [{ rum: 'R012345678903456789' }] },
    fundings: [
      {
        _id: new ObjectId(),
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayers[0]._id,
        subscription: subIdList[1],
        frequency: ONCE,
        versions: [{
          folderNumber: 'D123456',
          startDate: '2019-10-01T00:00:00.000Z',
          createdAt: '2019-10-01T00:00:00.000Z',
          endDate: '2020-02-01T00:00:00.000Z',
          amountTTC: 1200,
          customerParticipationRate: 66,
          careDays: [0, 1, 2, 3, 4, 5, 6],
        },
        {
          folderNumber: 'D123456',
          startDate: '2020-02-02T00:00:00.000Z',
          createdAt: '2020-02-02T00:00:00.000Z',
          amountTTC: 1600,
          customerParticipationRate: 66,
          careDays: [0, 1, 2, 3, 4, 5],
        }],
      },
    ],
  },
  { // 9 - stopped with billed events
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Julian', lastname: 'Theresa' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    stoppedAt: '2020-06-01T23:00:00.000Z',
    stopReason: DEATH,
  },
  { // 10
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Julian', lastname: 'Bedot' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    createdAt: '2021-05-24T00:00:00.000Z',
  },
  { // 11
    _id: new ObjectId(),
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
    stoppedAt: '2022-07-13T12:15:15.000Z',
    stopReason: DEATH,
    archivedAt: '2022-08-13T12:15:15.000Z',
  },
  { // 12
    _id: new ObjectId(),
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
    stoppedAt: '2022-07-13T12:15:15.000Z',
    stopReason: DEATH,
  },
  { // 13 - stopped with non billed, to invoice events
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'thepower', lastname: 'agathe' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    stoppedAt: '2020-06-01T23:00:00.000Z',
    stopReason: QUALITY,
  },
  // 14 - customer with bill and archived
  {
    _id: new ObjectId(),
    company: authCompany._id,
    stoppedAt: '2021-06-01T23:00:00.000Z',
    stopReason: QUALITY,
    archivedAt: '2021-07-01T23:00:00.000Z',
    identity: { title: 'mr', firstname: 'Baltazar', lastname: 'ChivedWithBills' },
    driveFolder: { driveId: '1234567890' },
    subscriptions: [{
      _id: subIdList[0],
      service: customerServiceList[0]._id,
      versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, saturdays: 2 }],
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
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'agathe', lastname: 'lenoir' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    stoppedAt: '2020-06-01T23:00:00.000Z',
    stopReason: QUALITY,
  },
];

const billList = [
  {
    _id: new ObjectId(),
    type: 'automatic',
    company: customersList[4].company,
    number: 'FACT-1901001',
    date: '2019-05-29T00:00:00.000Z',
    customer: customersList[4]._id,
    netInclTaxes: 75.96,
    subscriptions: [{
      startDate: '2019-05-29T00:00:00.000Z',
      endDate: '2019-11-29T00:00:00.000Z',
      subscription: customersList[5].subscriptions[0]._id,
      service: {
        serviceId: new ObjectId(),
        name: 'Temps de qualité - autonomie',
        nature: 'fixed',
      },
      vat: 5.5,
      events: [{
        eventId: new ObjectId(),
        startDate: '2019-01-16T09:30:19.000Z',
        endDate: '2019-01-16T11:30:21.000Z',
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
    _id: new ObjectId(),
    type: 'automatic',
    company: customersList[14].company,
    number: 'FACT-1901002',
    date: '2019-05-29T00:00:00.000Z',
    customer: customersList[14]._id,
    netInclTaxes: 75.96,
    subscriptions: [{
      startDate: '2019-05-29T00:00:00.000Z',
      endDate: '2019-11-29T00:00:00.000Z',
      subscription: customersList[5].subscriptions[0]._id,
      service: {
        serviceId: new ObjectId(),
        name: 'Temps de qualité - autonomie',
        nature: 'fixed',
      },
      vat: 5.5,
      events: [{
        eventId: new ObjectId(),
        fundingId: customersList[0].fundings[1]._id,
        thirdPartyPayer: customersList[0].fundings[1].thirdPartyPayer,
        startDate: '2019-01-16T09:30:19.000Z',
        endDate: '2019-01-16T11:30:21.000Z',
        auxiliary: referentList[0]._id,
        inclTaxesCustomer: 12,
        exclTaxesCustomer: 10,
        inclTaxesTpp: 12,
        exclTaxesTpp: 10,
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
  _id: new ObjectId(),
  company: customersList[5].company,
  number: 'REG-101031900201',
  date: '2019-05-26T15:47:42.000Z',
  customer: customersList[5]._id,
  netInclTaxes: 190,
  nature: 'payment',
  type: 'direct_debit',
};

const creditNote = {
  _id: new ObjectId(),
  date: '2020-01-01',
  startDate: '2020-01-01T00:00:00.000Z',
  endDate: '2020-01-12T00:00:00.000Z',
  customer: customersList[6]._id,
  exclTaxesCustomer: 100,
  inclTaxesCustomer: 112,
  isEditable: true,
  company: authCompany._id,
};

const taxCertificate = {
  _id: new ObjectId(),
  company: authCompany._id,
  customer: customersList[7]._id,
  year: '2019',
};

const referentHistories = [
  {
    customer: customersList[0]._id,
    auxiliary: referentList[0]._id,
    company: customersList[0].company,
    startDate: '2020-05-13T00:00:00.000Z',
  },
  {
    customer: customersList[0]._id,
    auxiliary: referentList[1]._id,
    company: customersList[0].company,
    startDate: '2019-05-13T00:00:00.000Z',
  },
  {
    customer: customersList[3]._id,
    auxiliary: referentList[1]._id,
    company: customersList[0].company,
    startDate: '2019-05-13T00:00:00.000Z',
  },
];

const otherCompanyCustomers = [
  {
    company: otherCompany._id,
    _id: otherCompanyCustomerId,
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
    subscriptions: [{
      _id: new ObjectId(),
      service: serviceIdList[0],
      versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
    }, {
      _id: new ObjectId(),
      service: serviceIdList[1],
      versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
    }],
    subscriptionsHistory: [{
      subscriptions: [
        { unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1, service: 'Service 1' },
        { unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1, service: 'Service 2' },
      ],
      helper: { firstname: 'Vladimir', lastname: 'Poutine', title: 'mr' },
      approvalDate: '2018-01-01T10:00:00.000Z',
    }],
    payment: {
      bankAccountOwner: 'David gaudu',
      iban: '',
      bic: '',
      mandates: [{ _id: new ObjectId(), rum: 'R012345678903456789' }],
    },
    quotes: [{
      _id: new ObjectId(),
      subscriptions: [
        { service: { name: 'Test', nature: 'hourly' }, unitTTCRate: 23, weeklyHours: 3 },
        { service: { name: 'Test2', nature: 'hourly' }, unitTTCRate: 30, weeklyHours: 10 },
      ],
    }],
    fundings: [
      {
        _id: new ObjectId(),
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayers[0]._id,
        subscription: subIdList[2],
        frequency: ONCE,
        versions: [{
          folderNumber: 'D123456',
          startDate: '2022-01-17T00:00:00.000Z',
          endDate: '2022-07-17T23:59:59.000Z',
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [0, 1, 2, 3, 4, 5, 6],
        }],
      },
    ],
  },
  {
    company: otherCompany._id,
    _id: new ObjectId(),
    identity: { title: 'mr', firstname: 'akatest', lastname: 'test' },
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
    subscriptions: [{
      _id: new ObjectId(),
      service: serviceIdList[0],
      versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
    }],
    subscriptionsHistory: [{
      subscriptions: [
        { unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1, service: 'Service 1' },
        { unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1, service: 'Service 2' },
      ],
      helper: { firstname: 'Vladimir', lastname: 'Poutine', title: 'mr' },
      approvalDate: '2018-01-01T10:00:00.000Z',
    }],
  },
];

const userList = [
  { // 0
    _id: new ObjectId(),
    identity: { firstname: 'HelperForCustomer', lastname: 'TheEtMoselle' },
    local: { email: 'helper_for_customer_customer@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    origin: WEBAPP,
  },
  { // 1
    _id: new ObjectId(),
    identity: { firstname: 'HelperForCustomer2', lastname: 'Rtre' },
    local: { email: 'helper_for_customer_customer2@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    origin: WEBAPP,
  },
  { // 2
    _id: new ObjectId(),
    identity: { firstname: 'HelperForCustomer4', lastname: 'Life' },
    local: { email: 'helper_for_customer_customer4@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    origin: WEBAPP,
  },
  { // 3
    _id: new ObjectId(),
    identity: { firstname: 'HelperForCustomerOtherCompany', lastname: 'Caragua' },
    local: { email: 'helper_for_customer_other_company@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    origin: WEBAPP,
  },
  { // 4
    _id: new ObjectId(),
    identity: { firstname: 'AdminForOtherCompany', lastname: 'Test' },
    local: { email: 'admin_for_other_company@alenvi.io', password: '123456!eR' },
    refreshToken: uuidv4(),
    role: { client: clientAdminRoleId },
    origin: WEBAPP,
  },
  { // 5
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary', lastname: 'Devo' },
    local: { email: 'auxforevent@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    origin: WEBAPP,
  },
  { // 6
    _id: new ObjectId(),
    identity: { firstname: 'Auxiliary', lastname: 'Vé' },
    local: { email: 'auxforcustomer@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    origin: WEBAPP,
  },
  { // 7
    _id: new ObjectId(),
    identity: { firstname: 'HelperForCustomerToDelete', lastname: 'Gence' },
    local: { email: 'helper_for_customer_to_delete@alenvi.io' },
    refreshToken: uuidv4(),
    role: { client: helperRoleId },
    origin: WEBAPP,
  },
];

const sectorsList = [
  { _id: new ObjectId(), name: 'Super Equipe', company: authCompany._id },
  { _id: new ObjectId(), name: 'Equipe Genial', company: authCompany._id },
  { _id: new ObjectId(), name: 'Autre equipe Genial', company: otherCompany._id },
];

const sectorHistoriesList = [
  {
    sector: sectorsList[0]._id,
    auxiliary: userList[5],
    company: authCompany._id,
    startDate: '2019-01-01T00:00:00.000Z',
  },
  {
    sector: sectorsList[1]._id,
    auxiliary: userList[6],
    company: authCompany._id,
    startDate: '2019-01-01T00:00:00.000Z',
  },
];

const eventList = [
  { // 0
    _id: new ObjectId(),
    company: authCompany._id,
    isBilled: true,
    customer: customersList[0]._id,
    type: 'intervention',
    sector: sectorsList[0]._id,
    subscription: subIdList[4],
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 1
    _id: new ObjectId(),
    company: authCompany._id,
    isBilled: true,
    customer: customersList[14]._id,
    type: 'intervention',
    sector: new ObjectId(),
    subscription: subIdList[4],
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 2
    _id: new ObjectId(),
    isBilled: false,
    company: authCompany._id,
    customer: customersList[0]._id,
    type: 'intervention',
    sector: new ObjectId(),
    subscription: subIdList[4],
    startDate: '2019-01-17T14:30:19.000Z',
    endDate: '2019-01-17T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 3
    _id: new ObjectId(),
    sector: new ObjectId(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2020-12-14T09:30:19.000Z',
    endDate: '2020-12-14T11:30:21.000Z',
    customer: customersList[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: subIdList[4],
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 4
    _id: new ObjectId(),
    sector: new ObjectId(),
    company: authCompany._id,
    type: 'intervention',
    startDate: '2019-01-16T09:30:19.000Z',
    endDate: '2019-01-16T11:30:21.000Z',
    customer: customersList[0]._id,
    createdAt: '2019-01-15T11:33:14.343Z',
    subscription: subIdList[4],
    isBilled: true,
    bills: {
      thirdPartyPayer: customerThirdPartyPayers[0]._id,
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
      inclTaxesTpp: 10,
      exclTaxesTpp: 5,
      fundingId: new ObjectId(),
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
  { // 5
    _id: new ObjectId(),
    company: otherCompany._id,
    isBilled: true,
    customer: otherCompanyCustomerId,
    type: 'intervention',
    bills: {
      thirdPartyPayer: new ObjectId(),
      inclTaxesCustomer: 20,
      exclTaxesCustomer: 15,
      inclTaxesTpp: 10,
      exclTaxesTpp: 5,
      fundingId: new ObjectId(),
      nature: 'hourly',
      careHours: 2,
    },
    sector: sectorsList[1]._id,
    subscription: new ObjectId(),
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 6
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[1]._id,
    auxiliary: userList[5]._id,
    type: 'intervention',
    subscription: new ObjectId(),
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 7
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[2]._id,
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectId(),
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 8
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[12]._id,
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectId(),
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 9
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[9]._id,
    isBilled: true,
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectId(),
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 10
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[13]._id,
    isBilled: false,
    isCancelled: true,
    cancel: { reason: 'auxiliary_initiative', condition: 'invoiced_and_not_paid' },
    misc: 'skusku',
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectId(),
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 11
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[15]._id,
    isBilled: false,
    isCancelled: true,
    cancel: { reason: 'auxiliary_initiative', condition: 'not_invoiced_and_not_paid' },
    misc: 'skusku',
    auxiliary: userList[6]._id,
    type: 'intervention',
    subscription: new ObjectId(),
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T15:30:21.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 12
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[0]._id,
    type: 'intervention',
    sector: sectorsList[0]._id,
    subscription: subIdList[4],
    startDate: CompaniDate().oldAdd({ days: 1 }).toISO(),
    endDate: CompaniDate().oldAdd({ days: 1, hours: 1 }).toISO(),
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 13
    _id: new ObjectId(),
    company: otherCompany._id,
    isBilled: true,
    customer: otherCompanyCustomers[0]._id,
    type: 'intervention',
    sector: sectorsList[2]._id,
    subscription: otherCompanyCustomers[0].subscriptions[0]._id,
    startDate: '2019-01-16T14:30:19.000Z',
    endDate: '2019-01-16T16:30:19.000Z',
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
];

const customerAbsenceList = [
  {
    company: authCompany._id,
    customer: customersList[0]._id,
    startDate: CompaniDate().oldAdd({ days: 1 }).toISO(),
    endDate: CompaniDate().oldAdd({ days: 1, hours: 1 }).toISO(),
    absenceType: HOSPITALIZATION,
  },
  {
    company: authCompany._id,
    customer: customersList[3]._id,
    startDate: '2022-02-02T00:00:00.000Z',
    endDate: '2022-03-02T00:00:00.000Z',
    absenceType: HOSPITALIZATION,
  },
];

const repetitionParentId = new ObjectId();
const repetition = {
  _id: new ObjectId(),
  customer: customersList[3]._id,
  parentId: repetitionParentId,
  subscription: subIdList[3],
  repetition: { frequency: EVERY_WEEK },
  company: authCompany._id,
  type: 'intervention',
  address: {
    fullAddress: '37 rue de ponthieu 75008 Paris',
    zipCode: '75008',
    city: 'Paris',
    street: '37 rue de Ponthieu',
    location: { type: 'Point', coordinates: [2.377133, 48.801389] },
  },
};

const helpersList = [
  { customer: customersList[0]._id, user: userList[0]._id, company: authCompany._id, referent: true },
  { customer: customersList[1]._id, user: userList[1]._id, company: authCompany._id, referent: true },
  { customer: customersList[4]._id, user: userList[2]._id, company: authCompany._id, referent: true },
  { customer: customersList[3]._id, user: userList[7]._id, company: authCompany._id, referent: true },
  { customer: otherCompanyCustomerId, user: userList[3]._id, company: otherCompany._id, referent: true },
];

const userCompaniesList = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: referentList[0]._id,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: referentList[0]._id, company: authCompany._id },
  { _id: new ObjectId(), user: referentList[1]._id, company: authCompany._id },
  { _id: new ObjectId(), user: userList[0]._id, company: authCompany._id },
  { _id: new ObjectId(), user: userList[1]._id, company: authCompany._id },
  { _id: new ObjectId(), user: userList[2]._id, company: authCompany._id },
  { _id: new ObjectId(), user: userList[3]._id, company: otherCompany._id },
  { _id: new ObjectId(), user: userList[4]._id, company: otherCompany._id },
];

const eventHistoriesList = [
  {
    event: { eventId: new ObjectId(), type: 'intervention', customer: customersList[3]._id },
    company: authCompany._id,
    action: 'event_creation',
    auxiliaries: [referentList[1]._id],
  },
];

const partnersList = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'Anne', lastname: 'Onyme' },
    company: authCompany._id,
    partnerOrganization: new ObjectId(),
  },
];

const customerPartnersList = [
  { _id: new ObjectId(), partner: partnersList[0]._id, customer: customersList[3], company: authCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Bill.create(billList),
    CreditNote.create(creditNote),
    Customer.create([...customersList, ...otherCompanyCustomers]),
    CustomerAbsence.create(customerAbsenceList),
    CustomerPartner.create(customerPartnersList),
    Event.create(eventList),
    EventHistory.create(eventHistoriesList),
    Helper.create(helpersList),
    Partner.create(partnersList),
    Payment.create(payment),
    ReferentHistory.create(referentHistories),
    Repetition.create(repetition),
    Sector.create(sectorsList),
    SectorHistory.create(sectorHistoriesList),
    Service.create(customerServiceList),
    TaxCertificate.create(taxCertificate),
    ThirdPartyPayer.create(customerThirdPartyPayers),
    User.create([...userList, ...referentList]),
    UserCompany.create(userCompaniesList),
  ]);
};

module.exports = {
  customersList,
  userList,
  populateDB,
  archivedService,
  serviceIdList,
  customerThirdPartyPayers,
  otherCompanyCustomers,
  sectorsList,
};
