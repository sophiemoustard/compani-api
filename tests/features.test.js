const expect = require('expect');
// const { ObjectID } = require('mongodb');

const app = require('../server');
const { getToken, populateUsers } = require('./seed/usersSeed');
const { populateRoles, featurePayload } = require('./seed/rolesSeed');
const Role = require('../models/Role');
const Feature = require('../models/Feature');

describe('FEATURES ROUTES', () => {
  let token = null;
  beforeEach(populateRoles);
  beforeEach(populateUsers);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('POST /features', () => {
    let res = null;
    beforeEach(async () => {
      res = await app.inject({
        method: 'POST',
        url: '/features',
        payload: featurePayload,
        headers: { 'x-access-token': token }
      });
    });
    it('should create a feature', async () => {
      expect(res.statusCode).toBe(200);
      expect(res.result.data.feature.name).toBe(featurePayload.name);

      const feature = await Feature.findById(res.result.data.feature._id);
      expect(feature.name).toBe(featurePayload.name);
    });

    it('should add feature to all existing roles with zero as permission level', async () => {
      const roles = await Role.find({});
      roles.filter(role => !role.name.match(/^Admin$/i)).forEach((role) => {
        expect(role.features).toEqual(expect.arrayContaining([
          expect.objectContaining({
            feature_id: res.result.data.feature._id,
            permission_level: 0
          })
        ]));
      });
    });

    it('should add feature to admin role with 2 as permission level', async () => {
      const admin = await Role.find({ name: 'Admin' });
      expect(admin[0].features).toEqual(expect.arrayContaining([
        expect.objectContaining({
          feature_id: res.result.data.feature._id,
          permission_level: 2
        })
      ]));
    });
  });
});
