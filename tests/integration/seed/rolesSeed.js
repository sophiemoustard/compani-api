const { ObjectID } = require('mongodb');
const { populateDBForAuthentication } = require('./authenticationSeed');
const Role = require('../../../src/models/Role');
const Right = require('../../../src/models/Right');

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

const rolesList = [
  {
    _id: new ObjectID(),
    name: 'general',
    interface: 'client',
    rights: [
      {
        right_id: rightsList[0]._id,
        hasAccess: true,
      },
      {
        right_id: rightsList[1]._id,
        hasAccess: true,
      },
    ],
  },
  {
    _id: new ObjectID(),
    name: 'chef',
    interface: 'client',
    rights: [
      {
        right_id: rightsList[0]._id,
        hasAccess: true,
      },
      {
        right_id: rightsList[1]._id,
        hasAccess: true,
      },
    ],
  },
  {
    _id: new ObjectID(),
    name: 'adjudant',
    interface: 'client',
    rights: [
      {
        right_id: rightsList[0]._id,
        hasAccess: true,
      },
      {
        right_id: rightsList[1]._id,
        hasAccess: false,
      },
    ],
  },
];

const rolePayload = {
  name: 'Test',
  interface: 'client',
  rights: [
    {
      right_id: rightsList[0]._id,
      hasAccess: true,
    },
    {
      right_id: rightsList[1]._id,
      hasAccess: true,
    },
  ],
};

const populateDB = async () => {
  await Role.deleteMany({});
  await Right.deleteMany({});

  await populateDBForAuthentication();
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
};

module.exports = {
  rolesList,
  rightsList,
  populateDB,
  rolePayload,
};
