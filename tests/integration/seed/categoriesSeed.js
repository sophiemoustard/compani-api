const { ObjectId } = require('mongodb');
const Category = require('../../../src/models/Category');
const Program = require('../../../src/models/Program');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const categoriesList = [
  { _id: new ObjectId(), name: 'ma première catégorie' },
  { _id: new ObjectId(), name: 'ma seconde catégorie' },
  { _id: new ObjectId(), name: 'ma troisième catégorie' },
  { _id: new ObjectId(), name: 'ce nom de catégorie est déja pris!' },
  { _id: new ObjectId(), name: 'cette catégorie est utilisée' },
];

const programsList = [
  { _id: new ObjectId(), name: 'program 1', categories: [categoriesList[4]._id] },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([Category.create(categoriesList), Program.create(programsList)]);
};

module.exports = {
  populateDB,
  categoriesList,
};
