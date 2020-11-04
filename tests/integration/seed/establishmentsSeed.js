const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Establishment = require('../../../src/models/Establishment');
const User = require('../../../src/models/User');
const {
  populateDBForAuthentication,
  authCompany,
  otherCompany,
  rolesList,
} = require('./authenticationSeed');

const establishmentsList = [
  {
    _id: new ObjectID(),
    name: 'Toto',
    siret: '12345678901234',
    address: {
      street: '15, rue du test',
      fullAddress: '15, rue du test 75007 Paris',
      zipCode: '75007',
      city: 'Paris',
      location: {
        type: 'Point',
        coordinates: [4.849302, 2.90887],
      },
    },
    phone: '0123456789',
    workHealthService: 'MT01',
    urssafCode: '117',
    company: authCompany,
  },
  {
    _id: new ObjectID(),
    name: 'Tata',
    siret: '09876543210987',
    address: {
      street: '37, rue des acacias',
      fullAddress: '37, rue des acacias 69000 Lyon',
      zipCode: '69000',
      city: 'Lyon',
      location: {
        type: 'Point',
        coordinates: [4.824302, 3.50807],
      },
    },
    phone: '0446899034',
    workHealthService: 'MT01',
    urssafCode: '217',
    company: authCompany,
  },
];

const establishmentFromOtherCompany = {
  _id: new ObjectID(),
  name: 'Test',
  siret: '19836443210989',
  address: {
    street: '37, rue des lilas',
    fullAddress: '37, rue des lilas 69000 Lyon',
    zipCode: '69000',
    city: 'Lyon',
    location: {
      type: 'Point',
      coordinates: [4.824302, 3.50807],
    },
  },
  phone: '0443890034',
  workHealthService: 'MT01',
  urssafCode: '217',
  company: otherCompany._id,
};

const userFromOtherCompany = {
  _id: new ObjectID(),
  identity: { firstname: 'Admin', lastname: 'Chef' },
  refreshToken: uuidv4(),
  local: { email: 'other_admin@alenvi.io', password: '123456!eR' },
  role: { client: rolesList.find(role => role.name === 'client_admin')._id },
  company: otherCompany._id,
};

const user = {
  _id: new ObjectID(),
  identity: { firstname: 'User', lastname: 'Test' },
  local: { email: 'auxiliary_establishment@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'auxiliary')._id },
  company: authCompany._id,
  establishment: establishmentsList[1]._id,
};

const populateDB = async () => {
  await Establishment.deleteMany();
  await User.deleteMany();

  await populateDBForAuthentication();

  await User.create([userFromOtherCompany, user]);
  await Establishment.insertMany([...establishmentsList, establishmentFromOtherCompany]);
};

module.exports = {
  populateDB,
  establishmentsList,
  establishmentFromOtherCompany,
  userFromOtherCompany,
};
