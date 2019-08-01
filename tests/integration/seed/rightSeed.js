const { ObjectID } = require('mongodb');
const { populateDBForAuthentification } = require('./authentificationSeed');
const Right = require('../../../models/Right');

const rightsList = [
  {
    _id: new ObjectID(),
    description: 'right3',
    permission: 'right3:write',
  },
  {
    _id: new ObjectID(),
    description: 'right4',
    permission: 'right4:read',
  },
];

const rightPayload = { description: 'test', permission: 'test:read' };

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
