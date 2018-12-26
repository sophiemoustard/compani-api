const { ObjectID } = require('mongodb');

const Role = require('../../../models/Role');
const Right = require('../../../models/Right');

const rightsList = [
  {
    _id: new ObjectID(),
    name: 'right1',
    description: 'right1',
    permission: 'right1:read'
  },
  {
    _id: new ObjectID(),
    name: 'right2',
    description: 'right2',
    permission: 'right2:write'
  },
  {
    _id: new ObjectID(),
    name: 'right3',
    description: 'right3',
    permission: 'right3:write'
  },
  {
    _id: new ObjectID(),
    name: 'right4',
    description: 'right4',
    permission: 'right4:read'
  }
];

const rolesList = [
  {
    _id: new ObjectID(),
    name: 'Tech',
    rights: [
      {
        right_id: rightsList[0]._id,
        hasAccess: true
      },
      {
        right_id: rightsList[1]._id,
        hasAccess: true
      },
      {
        right_id: rightsList[2]._id,
        hasAccess: true
      }
    ]
  },
  {
    _id: new ObjectID(),
    name: 'Admin',
    rights: [
      {
        right_id: rightsList[0]._id,
        hasAccess: true
      },
      {
        right_id: rightsList[1]._id,
        hasAccess: true
      },
      {
        right_id: rightsList[2]._id,
        hasAccess: true
      }
    ]
  },
  {
    _id: new ObjectID(),
    name: 'Coach',
    rights: [
      {
        right_id: rightsList[0]._id,
        hasAccess: true
      },
      {
        right_id: rightsList[1]._id,
        hasAccess: false
      },
      {
        right_id: rightsList[2]._id,
        hasAccess: true
      }
    ]
  },
  {
    _id: new ObjectID(),
    name: 'Auxiliaire',
    rights: [
      {
        right_id: rightsList[0]._id,
        hasAccess: true
      },
      {
        right_id: rightsList[1]._id,
        hasAccess: false
      },
      {
        right_id: rightsList[2]._id,
        hasAccess: false
      }
    ]
  },
];

const rolePayload = {
  name: 'Test',
  rights: [
    {
      right_id: rightsList[0]._id,
      hasAccess: true
    },
    {
      right_id: rightsList[1]._id,
      hasAccess: true
    },
    {
      right_id: rightsList[2]._id,
      hasAccess: false
    }
  ]
};

const wrongRolePayload = {
  name: 'T',
  rights: [
    {
      _id: rightsList[0]._id,
      name: rightsList[0].name,
      permission_level: 'meh',
    },
    {
      _id: rightsList[1]._id,
      name: rightsList[1].name,
      permission_level: 9
    },
    {
      _id: rightsList[2]._id,
      name: rightsList[2].name,
      permission_level: 1
    }
  ]
};

const rightPayload = { name: 'Test', description: 'test', permission: 'test:read' };

const populateRoles = async () => {
  await Role.remove({});
  await Right.remove({});

  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
};

module.exports = {
  rolesList,
  rightsList,
  rolePayload,
  wrongRolePayload,
  populateRoles,
  rightPayload,
};
