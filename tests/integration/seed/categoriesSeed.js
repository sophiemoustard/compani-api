const { ObjectID } = require('mongodb');
const Category = require('../../../src/models/Category');
const { populateDBForAuthentication } = require('./authenticationSeed');

const categoriesList = [
  { _id: new ObjectID(), name: 'ma première catégorie' },
  { _id: new ObjectID(), name: 'ma seconde catégorie' },
  { _id: new ObjectID(), name: 'ma troisième catégorie' },
  { _id: new ObjectID(), name: 'ce nom de catégorie est déja pris!' },
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
