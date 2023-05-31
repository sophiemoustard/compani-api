const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { HOURLY, MONTHLY, INTERVENTION, NEVER, WEBAPP } = require('../../../src/helpers/constants');
const Contract = require('../../../src/models/Contract');
const Customer = require('../../../src/models/Customer');
const Event = require('../../../src/models/Event');
const Service = require('../../../src/models/Service');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const User = require('../../../src/models/User');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { auxiliaryRoleId } = require('../../seed/authRolesSeed');

const teletransmissionTppList = [
  { // 0
    _id: new ObjectId(),
    name: 'Toto',
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
    companyCode: '449',
    teletransmissionId: 'CG77',
    teletransmissionType: 'APA',
  },
  { // 1
    _id: new ObjectId(),
    name: 'Tata',
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
    companyCode: '449',
    teletransmissionId: 'CG77',
    teletransmissionType: 'APA',
  },
  { // 2 - different company
    _id: new ObjectId(),
    name: 'Titi',
    company: otherCompany._id,
    isApa: true,
    billingMode: 'direct',
    companyCode: '123',
    teletransmissionId: 'CG77',
    teletransmissionType: 'APA',
  },
  { // 3 - different companyCode
    _id: new ObjectId(),
    name: 'Tutu',
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
    companyCode: '450',
    teletransmissionId: 'CG77',
    teletransmissionType: 'APA',
  },
  { // 4 - different teletransmissionId
    _id: new ObjectId(),
    name: 'Toutou',
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
    companyCode: '449',
    teletransmissionId: 'CG77',
    teletransmissionType: 'PCH',
  },
  { // 5 - missing teletransmissionId
    _id: new ObjectId(),
    name: 'Tonton',
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
    companyCode: '449',
    teletransmissionType: 'APA',
  },
  { // 6 - missing teletransmissionType
    _id: new ObjectId(),
    name: 'Teuteu',
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
    companyCode: '449',
    teletransmissionId: 'CG77',
  },
  { // 7 - missing companyCode
    _id: new ObjectId(),
    name: 'Toitoi',
    company: authCompany._id,
    isApa: true,
    billingMode: 'direct',
    teletransmissionId: 'CG77',
    teletransmissionType: 'APA',
  },
];

const serviceList = [
  {
    _id: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      exemptFromCharges: false,
      name: 'Service archivé',
      startDate: '2019-01-18T19:58:15',
      vat: 1,
    }],
    nature: HOURLY,
  },
];

const subscriptionId = new ObjectId();
const customersList = [
  {
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
    },
    payment: { mandates: [{ rum: 'R09876543456765432', _id: new ObjectId() }] },
    subscriptions: [{
      _id: subscriptionId,
      service: serviceList[0]._id,
      versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
    }],
    fundings: [{
      _id: new ObjectId(),
      nature: HOURLY,
      frequency: MONTHLY,
      thirdPartyPayer: teletransmissionTppList[0]._id,
      subscription: subscriptionId,
      versions: [{
        folderNumber: 'D123456',
        startDate: '2021-08-08T00:00:00',
        careHours: 50,
        unitTTCRate: 20,
        customerParticipationRate: 40,
        careDays: [0, 1, 2, 3, 4, 5, 6],
      }],
    }],
  },
];

const auxiliaryId = new ObjectId();

const contractList = [
  {
    _id: new ObjectId(),
    serialNumber: 'sdfklasdkljfjsldfjksdss',
    user: auxiliaryId,
    startDate: '2010-09-03T00:00:00',
    company: authCompany._id,
    versions: [{ startDate: '2010-09-03T00:00:00', grossHourlyRate: 10.43, weeklyHours: 12 }],
  },
];

const auxiliaryList = [
  {
    _id: auxiliaryId,
    identity: { firstname: 'Thibaut', lastname: 'Pinot' },
    local: { email: 't@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '1234567890' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    origin: WEBAPP,
    contracts: [contractList[0]._id],
  },
];

const eventList = [
  { // 0
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: NEVER },
    startDate: '2021-09-16T09:30:19',
    endDate: '2021-09-16T11:30:21',
    auxiliary: auxiliaryList[0]._id,
    customer: customersList[0]._id,
    subscription: subscriptionId,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  { // 1
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    repetition: { frequency: NEVER },
    startDate: '2021-09-17T14:30:19',
    endDate: '2021-09-17T16:30:19',
    auxiliary: auxiliaryList[0]._id,
    customer: customersList[0]._id,
    subscription: subscriptionId,
    address: {
      fullAddress: '4 rue du test 92160 Antony',
      street: '4 rue du test',
      zipCode: '92160',
      city: 'Antony',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    isBilled: true,
    bills: { thirdPartyPayer: teletransmissionTppList[0]._id },
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Contract.create(contractList);
  await Customer.create(customersList);
  await Event.create(eventList);
  await Service.create(serviceList);
  await ThirdPartyPayer.create(teletransmissionTppList);
  await User.create(auxiliaryList);
};

module.exports = { populateDB, teletransmissionTppList };
