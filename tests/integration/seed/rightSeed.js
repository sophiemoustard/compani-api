const { ObjectID } = require('mongodb');
const { populateDBForAuthentification } = require('./authentificationSeed');
const Right = require('../../../models/Right');

const rightsList = [
  {
    _id: new ObjectID(),
    name: 'right3',
    description: 'right3',
    permission: 'right3:write',
  },
  {
    _id: new ObjectID(),
    name: 'right4',
    description: 'right4',
    permission: 'right4:read',
  },
];

const rightPayload = { name: 'Test', description: 'test', permission: 'test:read' };

const populateDB = async () => {
  await Right.deleteMany({});

  await populateDBForAuthentification();
  await Right.insertMany(rightsList);
};

module.exports = {
  rightsList,
  rightPayload,
  populateDB,
};
