const { ObjectID } = require('mongodb');
const Contract = require('../../../models/Contract');
const { userList } = require('./usersSeed');

const contractsList = [
  {
    creationDate: '2018-12-04T16:34:04.144Z',
    endDate: null,
    user: userList[4]._id,
    startDate: '2018-12-03T23:00:00.000Z',
    status: 'contract_with_company',
    _id: userList[4].contracts[0],
    versions: [
      {
        creationDate: '2018-12-04T16:34:04.144Z',
        endDate: null,
        grossHourlyRate: 10.28,
        isActive: true,
        startDate: '2018-12-03T23:00:00.000Z',
        weeklyHours: 9,
        _id: new ObjectID(),
      },
    ],
  },
];

const populateContracts = async () => {
  await Contract.remove({});
  await Contract.insertMany(contractsList);
};

module.exports = {
  contractsList,
  populateContracts,
};
