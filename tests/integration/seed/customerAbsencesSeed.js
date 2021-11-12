const { ObjectID } = require('mongodb');
const Customer = require('../../../src/models/Customer');
const CustomerAbsence = require('../../../src/models/CustomerAbsence');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const customersList = [
  {
    _id: new ObjectID(),
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
    _id: new ObjectID(),
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
];

const customerAbsences = [
  {
    company: authCompany._id,
    customer: customersList[0],
    startDate: '2021-10-01T00:00:00.000Z',
    endDate: '2021-10-15T00:00:00.000Z',
    absenceType: 'leave',
  },
  {
    company: authCompany._id,
    customer: customersList[0],
    startDate: '2021-11-01T00:00:00.000Z',
    endDate: '2021-11-05T00:00:00.000Z',
    absenceType: 'other',
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([Customer.create(customersList), CustomerAbsence.create(customerAbsences)]);
};

module.exports = { populateDB, customerAbsences, customersList };
