const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { WEBAPP } = require('../../../src/helpers/constants');
const Establishment = require('../../../src/models/Establishment');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { clientAdminRoleId, auxiliaryRoleId } = require('../../seed/authRolesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const establishmentsList = [
  {
    _id: new ObjectId(),
    name: 'Toto',
    siret: '12345678901234',
    address: {
      street: '15, rue du test',
      fullAddress: '15, rue du test 75007 Paris',
      zipCode: '75007',
      city: 'Paris',
      location: { type: 'Point', coordinates: [4.849302, 2.90887] },
    },
    phone: '0123456789',
    workHealthService: 'MT01',
    urssafCode: '117',
    company: authCompany,
  },
  {
    _id: new ObjectId(),
    name: 'Tata',
    siret: '09876543210987',
    address: {
      street: '37, rue des acacias',
      fullAddress: '37, rue des acacias 69000 Lyon',
      zipCode: '69000',
      city: 'Lyon',
      location: { type: 'Point', coordinates: [4.824302, 3.50807] },
    },
    phone: '0446899034',
    workHealthService: 'MT01',
    urssafCode: '217',
    company: authCompany,
  },
];

const establishmentFromOtherCompany = {
  _id: new ObjectId(),
  name: 'Test',
  siret: '19836443210989',
  address: {
    street: '37, rue des lilas',
    fullAddress: '37, rue des lilas 69000 Lyon',
    zipCode: '69000',
    city: 'Lyon',
    location: { type: 'Point', coordinates: [4.824302, 3.50807] },
  },
  phone: '0443890034',
  workHealthService: 'MT01',
  urssafCode: '217',
  company: otherCompany._id,
};

const userFromOtherCompany = {
  _id: new ObjectId(),
  identity: { firstname: 'Admin', lastname: 'Chef' },
  refreshToken: uuidv4(),
  local: { email: 'other_admin@alenvi.io', password: '123456!eR' },
  role: { client: clientAdminRoleId },
  origin: WEBAPP,
};

const user = {
  _id: new ObjectId(),
  identity: { firstname: 'User', lastname: 'Test' },
  local: { email: 'auxiliary_establishment@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: auxiliaryRoleId },
  establishment: establishmentsList[1]._id,
  origin: WEBAPP,
};

const userCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: user._id,
    company: otherCompany._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: user._id, company: authCompany._id },
  { _id: new ObjectId(), user: userFromOtherCompany._id, company: otherCompany._id },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Establishment.create([...establishmentsList, establishmentFromOtherCompany]),
    User.create([userFromOtherCompany, user]),
    UserCompany.create(userCompanies),
  ]);
};

module.exports = {
  populateDB,
  establishmentsList,
  establishmentFromOtherCompany,
  userFromOtherCompany,
};
