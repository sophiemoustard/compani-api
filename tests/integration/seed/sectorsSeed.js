const { ObjectID } = require('mongodb');
const Sector = require('../../../models/Sector');
const Company = require('../../../models/Company');
const { populateDBForAuthentification } = require('./authentificationSeed');

const sectorCompany = {
  _id: new ObjectID('5d3eb871dd552f11866eea7b'),
  name: 'Test',
  rhConfig: {
    internalHours: [
      { name: 'Formation', default: true, _id: new ObjectID() },
      { name: 'Code', default: false, _id: new ObjectID() },
      { name: 'Gouter', default: false, _id: new ObjectID() },
    ],
    feeAmount: 12,
  },
  iban: 'FR3514508000505917721779B12',
  bic: 'RTYUIKJHBFRG',
  ics: '12345678',
  directDebitsFolderId: '1234567890',
};

const sectorsList = [
  {
    _id: new ObjectID(),
    name: 'Test',
    companyId: sectorCompany._id,
  },
  {
    _id: new ObjectID(),
    name: 'Test2',
    companyId: sectorCompany._id,
  },
];


const populateDB = async () => {
  await Sector.deleteMany({});
  await Company.deleteMany({});

  await populateDBForAuthentification();
  await Sector.insertMany(sectorsList);
  await (new Company(sectorCompany)).save();
};

module.exports = { sectorsList, populateDB, sectorCompany };
