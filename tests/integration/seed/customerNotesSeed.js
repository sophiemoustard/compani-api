const { ObjectID } = require('mongodb');
const Customer = require('../../../src/models/Customer');
const CustomerNote = require('../../../src/models/CustomerNote');
const { authCompany, otherCompany, populateDBForAuthentication } = require('./authenticationSeed');

const customersList = [
  {
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
    },
  },
  {
    _id: new ObjectID(),
    company: otherCompany._id,
    identity: { title: 'mrs', firstname: 'Romane', lastname: 'Bardet' },
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

const customerNotesList = [
  {
    _id: new ObjectID(),
    title: 'Titre',
    description: 'Description',
    customer: customersList[0],
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    title: 'Titre 1',
    description: 'Description 2',
    customer: customersList[1],
    company: otherCompany._id,
  },
];

const populateDB = async () => {
  await Customer.deleteMany({});
  await CustomerNote.deleteMany({});

  await populateDBForAuthentication();
  await Customer.insertMany(customersList);
  await CustomerNote.insertMany(customerNotesList);
};

module.exports = {
  populateDB,
  customersList,
  customerNotesList,
};
