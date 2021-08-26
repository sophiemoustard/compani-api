const { ObjectID } = require('mongodb');
const Category = require('../../../src/models/Category');
const Program = require('../../../src/models/Program');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const categoriesList = [
  { _id: new ObjectID(), name: 'ma première catégorie' },
  { _id: new ObjectID(), name: 'ma seconde catégorie' },
  { _id: new ObjectID(), name: 'ma troisième catégorie' },
  { _id: new ObjectID(), name: 'ce nom de catégorie est déja pris!' },
  { _id: new ObjectID(), name: 'cette catégorie est utilisée' },
];

const programsList = [
  { _id: new ObjectID(), name: 'program 1', categories: [categoriesList[4]._id] },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Category.insertMany(categoriesList);
  await Program.insertMany(programsList);
};

module.exports = {
  populateDB,
  categoriesList,
  programsList,
};
