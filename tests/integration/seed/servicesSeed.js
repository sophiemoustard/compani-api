const { ObjectID } = require('mongodb');

const Service = require('../../../src/models/Service');
const Company = require('../../../src/models/Company');
const { CUSTOMER_CONTRACT, COMPANY_CONTRACT, HOURLY, FIXED } = require('../../../src/helpers/constants');
const { populateDBForAuthentication } = require('./authenticationSeed');

const company = {
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

const servicesList = [
  {
    _id: new ObjectID(),
    type: COMPANY_CONTRACT,
    company: company._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 1',
      startDate: '2019-01-16 17:58:15.519',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: new ObjectID(),
    type: CUSTOMER_CONTRACT,
    company: company._id,
    versions: [{
      defaultUnitAmount: 24,
      name: 'Service 2',
      startDate: '2019-01-18 19:58:15.519',
      vat: 12,
    }],
    nature: HOURLY,
  },
  {
    _id: new ObjectID(),
    type: COMPANY_CONTRACT,
    company: company._id,
    versions: [{
      defaultUnitAmount: 150,
      name: 'Service 3',
      startDate: '2019-01-16 17:58:15.519',
      vat: 12,
    }],
    nature: FIXED,
  },
];

const populateDB = async () => {
  await Service.deleteMany({});
  await Company.deleteMany({});

  await populateDBForAuthentication();
  await (new Company(company)).save();
  await Service.insertMany(servicesList);
};

module.exports = { servicesList, populateDB };
