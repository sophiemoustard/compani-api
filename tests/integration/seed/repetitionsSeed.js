const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Repetition = require('../../../src/models/Repetition');
const User = require('../../../src/models/User');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { authCompany } = require('../../seed/authCompaniesSeed');
const { auxiliaryRoleId } = require('../../seed/authRolesSeed');
const { WEBAPP } = require('../../../src/helpers/constants');
const UserCompany = require('../../../src/models/UserCompany');

const auxiliariesIdList = [new ObjectId(), new ObjectId()];
const customersIdList = [new ObjectId()];

const auxiliaryList = [
  {
    _id: auxiliariesIdList[0],
    identity: { firstname: 'Toto', lastname: 'Zero' },
    local: { email: 'toto@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '123456890' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [new ObjectId()],
    origin: WEBAPP,
  },
  {
    _id: auxiliariesIdList[1],
    identity: { firstname: 'TomTom', lastname: 'Nana' },
    local: { email: 'tom@p.com', password: '123456!eR' },
    administrative: { driveFolder: { driveId: '12345690' }, transportInvoice: { transportType: 'public' } },
    refreshToken: uuidv4(),
    role: { client: auxiliaryRoleId },
    contracts: [new ObjectId()],
    origin: WEBAPP,
  },
];

const repetitionList = [
  {
    type: 'intervention',
    startDate: '2021-11-11T10:30:00.000Z',
    endDate: '2021-11-11T12:30:00.000Z',
    auxiliary: auxiliariesIdList[0],
    customer: customersIdList[0],
    frequency: 'every_week',
    company: authCompany._id,
    address: {
      street: '37 rue de Ponthieu',
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
  },
  {
    type: 'internal_hour',
    startDate: '2021-11-10T10:30:00.000Z',
    endDate: '2021-11-10T12:30:00.000Z',
    auxiliary: auxiliariesIdList[0],
    frequency: 'every_week',
    company: authCompany._id,
  },
];

const userCompanies = [
  { _id: new ObjectId(), user: auxiliariesIdList[0], company: authCompany._id },
  { _id: new ObjectId(), user: auxiliariesIdList[1], company: authCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([Repetition.create(repetitionList), User.create(auxiliaryList), UserCompany.create(userCompanies)]);
};

module.exports = {
  repetitionList,
  auxiliariesIdList,
  populateDB,
};
