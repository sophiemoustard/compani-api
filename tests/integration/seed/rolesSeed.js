const { ObjectID } = require('mongodb');
const { populateDBForAuthentification } = require('./authentificationSeed');
const Role = require('../../../models/Role');
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

const rolesList = [
  {
    _id: new ObjectID(),
    name: 'general',
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

  await populateDBForAuthentification();
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
};

module.exports = {
  rolesList,
  rightsList,
  populateDB,
  rolePayload,
};
