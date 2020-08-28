const expect = require('expect');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const app = require('../../server');
const SubProgram = require('../../src/models/SubProgram');
const { populateDB, subProgramsList } = require('./seed/subProgramsSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SUBPROGRAMS ROUTES - PUT /subprograms/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const subProgramId = subProgramsList[0]._id;
  const payload = { name: 'un autre nom pour le sous-programme' };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should update subProgram', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${subProgramId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const subProgramUpdated = await SubProgram.findById(subProgramId);

      expect(response.statusCode).toBe(200);
      expect(subProgramUpdated).toEqual(expect.objectContaining({ _id: subProgramId, name: payload.name }));
    });

    it('should return a 400 if name is empty', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${subProgramId.toHexString()}`,
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
          url: `/subprograms/${subProgramId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('SUBPROGRAMS ROUTES - POST /subprograms/{_id}/step', () => {
  let authToken = null;
  beforeEach(populateDB);
  const payload = { name: 'new step', type: 'e_learning' };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create step', async () => {
      const subProgramId = subProgramsList[0]._id;
      const stepsLengthBefore = subProgramsList[0].steps.length;
      const response = await app.inject({
        method: 'POST',
        url: `/subprograms/${subProgramId.toHexString()}/steps`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const subProgramUpdated = await SubProgram.findById(subProgramId);

      expect(response.statusCode).toBe(200);
      expect(subProgramUpdated._id).toEqual(subProgramId);
      expect(subProgramUpdated.steps.length).toEqual(stepsLengthBefore + 1);
    });

    const missingParams = ['name', 'type'];
    missingParams.forEach((param) => {
      it(`should return a 400 if missing ${param}`, async () => {
        const subProgramId = subProgramsList[0]._id;
        const response = await app.inject({
          method: 'POST',
          url: `/subprograms/${subProgramId.toHexString()}/steps`,
          payload: omit(payload, param),
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 400 if program does not exist', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'POST',
        url: `/subprograms/${invalidId}/steps`,
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
        const subProgramId = subProgramsList[0]._id;
        const response = await app.inject({
          method: 'POST',
          payload,
          url: `/subprograms/${subProgramId.toHexString()}/steps`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('SUBPROGRAMS ROUTES - POST /subprograms/{_id}/step/{stepId}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should detach step from subprogram', async () => {
      const subProgramId = subProgramsList[0]._id;
      const stepsLengthBefore = subProgramsList[0].steps.length;
      const response = await app.inject({
        method: 'DELETE',
        url: `/subprograms/${subProgramId.toHexString()}/steps/${subProgramsList[0].steps[0]._id}`,
        headers: { 'x-access-token': authToken },
      });

      await SubProgram.findById(subProgramId);

      expect(response.statusCode).toBe(200);
      const subProgramUpdated = await SubProgram.findOne({ _id: subProgramId }).lean();
      expect(subProgramUpdated.steps.length).toEqual(stepsLengthBefore - 1);
      expect(subProgramUpdated.steps.some(step => step._id === subProgramsList[0].steps[0]._id)).toBeFalsy();
    });

    it('should return a 404 if subprogram does not exist', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'DELETE',
        url: `/subprograms/${invalidId}/steps/${subProgramsList[0].steps[0]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if subprogram does not contain step', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'DELETE',
        url: `/subprograms/${subProgramsList[0]._id}/steps/${invalidId}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
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
        const subProgramId = subProgramsList[0]._id;
        const response = await app.inject({
          method: 'DELETE',
          url: `/subprograms/${subProgramId.toHexString()}/steps/${subProgramsList[0].steps[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
