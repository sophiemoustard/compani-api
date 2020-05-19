const { ObjectID } = require('mongodb');
const { authCompany } = require('./companySeed');
const { HOURLY, COMPANY_CONTRACT } = require('../../src/helpers/constants');

const serviceList = [
  {
    _id: new ObjectID(),
    type: COMPANY_CONTRACT,
    company: authCompany._id,
    versions: [{
      defaultUnitAmount: 12,
      name: 'Service 1',
      startDate: '2019-01-16T17:58:15',
      vat: 12,
      exemptFromCharges: false,
    }],
    nature: HOURLY,
  },
];

module.exports = { serviceList };
