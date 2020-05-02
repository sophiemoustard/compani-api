const { ObjectID } = require('mongodb');
const moment = require('moment');
const { authCompany } = require('./companySeed');
const { customerList } = require('./customerSeed');

const taxCertificateList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    customer: customerList[0]._id,
    year: '2019',
    date: moment().subtract(1, 'y').endOf('y').toDate(),
  },
];

module.exports = { taxCertificateList };
