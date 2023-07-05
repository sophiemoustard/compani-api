const { ObjectId } = require('mongodb');
const { authCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');
const Bill = require('../../../src/models/Bill');
const Customer = require('../../../src/models/Customer');
const Helper = require('../../../src/models/Helper');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');

const customerId = new ObjectId();
const bill = {
  _id: new ObjectId(),
  type: 'automatic',
  shouldBeSent: true,
  customer: customerId,
  netInclTaxes: 880,
  date: '2021-08-04T21:00:00.000+00:00',
  createdAt: '2021-08-04T21:00:00.000+00:00',
  company: authCompany._id,
};

const customer = {
  _id: customerId,
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
  },
};

const userId = new ObjectId();
const user = {
  _id: userId,
  identity: { lastname: 'test' },
  local: { email: 'test@test.fr' },
  origin: 'webapp',
};

const userCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: userId,
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: userId, company: authCompany._id },
];
const helper = { _id: new ObjectId(), customer: customerId, user: userId, company: authCompany._id, referent: false };

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Bill.create(bill);
  await Customer.create(customer);
  await Helper.create(helper);
  await User.create(user);
  await UserCompany.create(userCompanies);
};

module.exports = { populateDB };
