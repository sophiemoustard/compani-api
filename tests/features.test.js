const expect = require('expect');
const { ObjectID } = require('mongodb');

const app = require('../server');
const { getToken, populateUsers } = require('./seed/usersSeed');
const { populateRoles, featurePayload, featuresList } = require('./seed/rolesSeed');
const Role = require('../models/Role');
const Feature = require('../models/Feature');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

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
      const roles = await Role.find({}, {}, { autopopulate: false });
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
      const admin = await Role.find({ name: 'Admin' }, {}, { autopopulate: false });
      expect(admin[0].features).toEqual(expect.arrayContaining([
        expect.objectContaining({
          feature_id: res.result.data.feature._id,
          permission_level: 2
        })
      ]));
    });

    it('should return a 400 error if bad parameters are passed', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/features',
        payload: { _id: '123456' },
        headers: { 'x-access-token': token }
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 error if feature already exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/features',
        payload: { name: 'Test' },
        headers: { 'x-access-token': token }
      });
      expect(response.statusCode).toBe(409);
    });
  });

  describe('PUT /features/{_id}', () => {
    it('should update a feature', async () => {
      const payload = { name: 'Kokonut' };
      const res = await app.inject({
        method: 'PUT',
        url: `/features/${featuresList[0]._id}`,
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.feature.name).toBe(payload.name);

      const feature = await Feature.findById(res.result.data.feature._id);
      expect(feature.name).toBe(payload.name);
    });

    it('should return a 400 error if bad parameters are passed', async () => {
      const payload = { test: 'Kokonut' };
      const res = await app.inject({
        method: 'PUT',
        url: `/features/${featuresList[0]._id}`,
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 409 error if feature name already exists', async () => {
      const payload = { name: 'feature2' };
      const res = await app.inject({
        method: 'PUT',
        url: `/features/${featuresList[0]._id}`,
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('GET /features', () => {
    it('should return all features', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/features',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.features.length).toBe(3);
    });

    it('should return features according to query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/features?name=feature1',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.features[0].name).toBe('feature1');
    });

    it('should return a 404 error if no features are found', async () => {
      await Feature.remove({});
      const res = await app.inject({
        method: 'GET',
        url: '/features',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return a 400 error if bad parameters are passed', async () => {
      await Feature.remove({});
      const res = await app.inject({
        method: 'GET',
        url: '/features?test=toto',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /features/{_id}', () => {
    it('should return a feature', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/features/${featuresList[0]._id}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.feature.name).toBe(featuresList[0].name);
      expect(res.result.data.feature._id.toHexString()).toBe(featuresList[0]._id.toHexString());
    });

    it('should return a 400 error if id is invalid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/features/123456',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 404 error if feature does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/features/${new ObjectID()}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /features/{_id}', () => {
    let res = null;
    beforeEach(async () => {
      res = await app.inject({
        method: 'DELETE',
        url: `/features/${featuresList[0]._id}`,
        headers: { 'x-access-token': token }
      });
    });
    it('should delete a feature', async () => {
      expect(res.statusCode).toBe(200);
      const feature = await Feature.findById(featuresList[0]._id);
      expect(feature).toBeNull();
    });

    it('should delete feature from all roles', async () => {
      const roles = await Role.find({});
      roles.forEach((role) => {
        expect(role.features).toEqual(expect.not.arrayContaining([
          { feature_id: featuresList[0]._id }
        ]));
      });
    });

    it('should return a 400 error if id is invalid', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/features/123456',
        headers: { 'x-access-token': token }
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return a 404 error if feature does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/features/${new ObjectID()}`,
        headers: { 'x-access-token': token }
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
