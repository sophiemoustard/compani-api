const { ObjectID } = require('mongodb');
const Company = require('../../../models/Company');
const faker = require('faker');

const companiesList = [
  {
    _id: new ObjectID(),
    name: 'Test',
    rhConfig: {
      internalHours: [
        { name: 'Formation', default: true, _id: new ObjectID() },
        { name: 'Code', default: false, _id: new ObjectID() },
        { name: 'Gouter', default: false, _id: new ObjectID() },
      ],
      feeAmount: 12,
    },
    iban: faker.finance.iban(),
    bic: faker.finance.bic(),
    ics: '12345678',
    directDebitsFolderId: '1234567890',
  },
];

const populateCompanies = async () => {
  await Company.deleteMany({});
  await Company.insertMany(companiesList);
};

module.exports = { companiesList, populateCompanies };
