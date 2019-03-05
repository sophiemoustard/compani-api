const { ObjectID } = require('mongodb');

const Service = require('../../../models/Service');

const servicesList = [
  {
    _id: new ObjectID(),
    versions: [{
      defaultUnitAmount: 12,
      eveningSurcharge: '',
      holidaySurcharge: '',
      name: 'Service 1',
      startDate: '2019-01-16 17:58:15.519',
      vat: 12,
    }],
    nature: 'Service 1',
  },
  {
    _id: new ObjectID(),
    versions: [{
      defaultUnitAmount: 24,
      eveningSurcharge: '',
      holidaySurcharge: '',
      name: 'Service 2',
      startDate: '2019-01-18 19:58:15.519',
      vat: 12,
    }],
    nature: 'Service 2',
  }
];

const populateServices = async () => {
  await Service.remove({});
  await Service.insertMany(servicesList);
};

module.exports = { servicesList, populateServices };
