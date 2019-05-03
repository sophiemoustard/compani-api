const { ObjectID } = require('mongodb');

const Service = require('../../../models/Service');
const { companiesList } = require('./companiesSeed');
const { CUSTOMER_CONTRACT, HOURLY } = require('../../../helpers/constants');

const servicesList = [
  {
    _id: new ObjectID(),
    type: CUSTOMER_CONTRACT,
    company: companiesList[0]._id,
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
    company: companiesList[0]._id,
    versions: [{
      defaultUnitAmount: 24,
      name: 'Service 2',
      startDate: '2019-01-18 19:58:15.519',
      vat: 12,
    }],
    nature: HOURLY,
  }
];

const populateServices = async () => {
  await Service.deleteMany({});
  await Service.insertMany(servicesList);
};

module.exports = { servicesList, populateServices };
