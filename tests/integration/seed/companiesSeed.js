const { ObjectID } = require('mongodb');
const Company = require('../../../models/Company');

const companiesList = [
  {
    _id: new ObjectID(),
    name: 'Test',
    customersConfig: {
      services: [
        {
          _id: new ObjectID(),
          defaultUnitAmount: 12,
          eveningSurcharge: '',
          holidaySurcharge: '',
          name: 'Service 1',
          nature: 'Service 1',
          vat: 12,
        },
      ],
    },
  },
];

const populateCompanies = async () => {
  await Company.remove({});
  await Company.insertMany(companiesList);
};

module.exports = { companiesList, populateCompanies };
