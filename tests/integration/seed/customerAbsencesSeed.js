const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Customer = require('../../../src/models/Customer');
const UserCompany = require('../../../src/models/UserCompany');
const Helper = require('../../../src/models/Helper');
const CustomerAbsence = require('../../../src/models/CustomerAbsence');
const User = require('../../../src/models/User');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { helperRoleId } = require('../../seed/authRolesSeed');
const { WEBAPP } = require('../../../src/helpers/constants');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const customersList = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Paul', lastname: 'Bardet' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
  },
  {
    _id: new ObjectId(),
    company: otherCompany._id,
    identity: { title: 'mrs', firstname: 'Romane', lastname: 'Chal' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Gerars', lastname: 'Menvussa' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Pierre', lastname: 'Poirot' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
  },
  { // stopped Customer
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Jesuis', lastname: 'Arrete' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
    stoppedAt: '2022-01-04T00:00:00.000Z',
    stopReason: 'hospitalization',
  },
];

const usersList = [{
  _id: new ObjectId(),
  identity: { firstname: 'Mike', lastname: 'ElJackson' },
  local: { email: 'dsfgag@tt.com', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: helperRoleId },
  origin: WEBAPP,
}];

const userCompanyList = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: usersList[0]._id,
    company: otherCompany._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { user: usersList[0]._id, company: authCompany._id },
];

const helpersList = [
  { customer: customersList[3]._id, user: usersList[0]._id, company: authCompany._id, referent: true },
];

const customerAbsencesList = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[0],
    startDate: '2021-10-01T00:00:00.000Z',
    endDate: '2021-10-15T00:00:00.000Z',
    absenceType: 'leave',
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[2],
    startDate: '2021-10-04T00:00:00.000Z',
    endDate: '2021-10-05T00:00:00.000Z',
    absenceType: 'hospitalization',
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[0],
    startDate: '2021-11-01T00:00:00.000Z',
    endDate: '2021-11-05T00:00:00.000Z',
    absenceType: 'other',
  },
  {
    _id: new ObjectId(),
    company: otherCompany._id,
    customer: customersList[1],
    startDate: '2021-10-08T00:00:00.000Z',
    endDate: '2021-10-09T00:00:00.000Z',
    absenceType: 'other',
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    customer: customersList[4],
    startDate: '2021-10-08T00:00:00.000Z',
    endDate: '2021-10-09T00:00:00.000Z',
    absenceType: 'other',
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Customer.create(customersList),
    CustomerAbsence.create(customerAbsencesList),
    Helper.create(helpersList),
    User.create(usersList),
    UserCompany.create(userCompanyList),
  ]);
};

module.exports = { populateDB, customerAbsencesList, customersList, helpersList, usersList };
