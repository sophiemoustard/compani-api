const { ObjectID } = require('mongodb');
const Category = require('../../../src/models/Category');
const { populateDBForAuthentication } = require('./authenticationSeed');

const categoriesList = [
  { _id: new ObjectID(), name: 'ma première catégorie' },
  { _id: new ObjectID(), name: 'ma seconde catégorie' },
  { _id: new ObjectID(), name: 'ma troisième catégorie' },
];

const populateDB = async () => {
  await Category.deleteMany({});

  await populateDBForAuthentication();

  await Category.insertMany(categoriesList);
};

module.exports = {
  populateDB,
  categoriesList,
};
