const { ObjectID } = require('mongodb');

const Role = require('../../models/Role');
const Feature = require('../../models/Feature');

const featuresList = [
  {
    _id: new ObjectID(),
    name: 'feature1',
  },
  {
    _id: new ObjectID(),
    name: 'feature2',
  },
  {
    _id: new ObjectID(),
    name: 'feature3',
  }
];

const rolesList = [
  {
    _id: new ObjectID(),
    name: 'Tech',
    features: [
      {
        feature_id: featuresList[0]._id,
        permission_level: 2
      },
      {
        feature_id: featuresList[1]._id,
        permission_level: 2
      },
      {
        feature_id: featuresList[2]._id,
        permission_level: 2
      }
    ]
  },
  {
    _id: new ObjectID(),
    name: 'Admin',
    features: [
      {
        feature_id: featuresList[0]._id,
        permission_level: 2
      },
      {
        feature_id: featuresList[1]._id,
        permission_level: 2
      },
      {
        feature_id: featuresList[2]._id,
        permission_level: 2
      }
    ]
  },
  {
    _id: new ObjectID(),
    name: 'Coach',
    features: [
      {
        feature_id: featuresList[0]._id,
        permission_level: 2
      },
      {
        feature_id: featuresList[1]._id,
        permission_level: 1
      },
      {
        feature_id: featuresList[2]._id,
        permission_level: 1
      }
    ]
  },
  {
    _id: new ObjectID(),
    name: 'Auxiliaire',
    features: [
      {
        feature_id: featuresList[0]._id,
        permission_level: 1
      },
      {
        feature_id: featuresList[1]._id,
        permission_level: 0
      },
      {
        feature_id: featuresList[2]._id,
        permission_level: 0
      }
    ]
  },
];

const rolePayload = {
  name: 'Test',
  features: [
    {
      _id: featuresList[0]._id,
      name: featuresList[0].name,
      permission_level: 1
    },
    {
      _id: featuresList[1]._id,
      name: featuresList[1].name,
      permission_level: 1
    },
    {
      _id: featuresList[2]._id,
      name: featuresList[2].name,
      permission_level: 1
    }
  ]
};

const populateRoles = async () => {
  console.log('POPULATING ROLES AND FEATURES...');
  await Role.remove({});
  await Feature.remove({});

  await Feature.insertMany(featuresList);
  await Role.insertMany(rolesList);
};

module.exports = { rolesList, featuresList, rolePayload, populateRoles };
