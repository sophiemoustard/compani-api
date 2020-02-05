const { ObjectID } = require('mongodb');
const AdministrativeDocument = require('../../../src/models/AdministrativeDocument');
const { authCompany, otherCompany, populateDBForAuthentication } = require('./authenticationSeed');

const administrativeDocumentsList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    name: 'test',
    driveFile: { driveId: '1234', link: 'www.test.fr' },
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    name: 'paie',
    driveFile: { driveId: '4567', link: 'www.1234.fr' },
  },
  {
    _id: new ObjectID(),
    company: otherCompany._id,
    name: 'contrat',
    driveFile: { driveId: '9876', link: 'www.alenvi.fr' },
  },
];

const populateDB = async () => {
  await AdministrativeDocument.deleteMany();

  await populateDBForAuthentication();

  await AdministrativeDocument.insertMany(administrativeDocumentsList);
};

module.exports = {
  administrativeDocumentsList,
  populateDB,
};
