const expect = require('expect');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const Step = require('../../src/models/Step');
const { populateDB, stepsList } = require('./seed/stepsSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('STEPS ROUTES - PUT /steps/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const stepId = stepsList[0]._id;
  const payload = { name: 'une nouvelle étape super innovant' };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should update step', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const stepUpdated = await Step.findById(stepId);

      expect(response.statusCode).toBe(200);
      expect(stepUpdated).toEqual(expect.objectContaining({ _id: stepId, name: payload.name }));
    });

    it('should return a 400 if name is equal to \'\' ', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}`,
        payload: { name: '' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          payload,
          url: `/steps/${stepId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('STEPS ROUTES - POST /steps/{_id}/activity', () => {
  let authToken = null;
  beforeEach(populateDB);
  const payload = { name: 'new activity', type: 'video' };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create activity', async () => {
      const stepId = stepsList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: `/steps/${stepId.toHexString()}/activities`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const stepUpdated = await Step.findById(stepId);

      expect(response.statusCode).toBe(200);
      expect(stepUpdated._id).toEqual(stepId);
      expect(stepUpdated.activities.length).toEqual(1);
    });

    ['name', 'type'].forEach((missingParam) => {
      it('should return a 400 if missing requiered param', async () => {
        const stepId = stepsList[0]._id;
        const response = await app.inject({
          method: 'POST',
          url: `/steps/${stepId.toHexString()}/activities`,
          payload: omit(payload, missingParam),
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 400 if invalid type', async () => {
      const wrongPayload = { ...payload, type: 'something_wrong' };
      const stepId = stepsList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: `/steps/${stepId.toHexString()}/activities`,
        payload: wrongPayload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if step does not exist', async () => {
      const wrongId = new ObjectID();
      const response = await app.inject({
        method: 'POST',
        url: `/steps/${wrongId}/activities`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const stepId = stepsList[0]._id;
        const response = await app.inject({
          method: 'POST',
          payload,
          url: `/steps/${stepId.toHexString()}/activities`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
