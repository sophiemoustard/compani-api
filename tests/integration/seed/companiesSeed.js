const { ObjectID } = require('mongodb');
const Company = require('../../../models/Company');

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
    }
  },
];

const populateCompanies = async () => {
  await Company.remove({});
  await Company.insertMany(companiesList);
};

module.exports = { companiesList, populateCompanies };
