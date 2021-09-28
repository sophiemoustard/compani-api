const expect = require('expect');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const app = require('../../server');
const SubProgram = require('../../src/models/SubProgram');
const Course = require('../../src/models/Course');
const Step = require('../../src/models/Step');
const { E_LEARNING } = require('../../src/helpers/constants');
const { populateDB, subProgramsList, stepsList, activitiesList, tester } = require('./seed/subProgramsSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SUBPROGRAMS ROUTES - PUT /subprograms/{_id}', () => {
  let authToken;
  beforeEach(populateDB);
  const blendedSubProgramId = subProgramsList[0]._id;
  const eLearningSubProgramId = subProgramsList[1]._id;

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should update subProgram name and steps #tag', async () => {
      const payload = {
        name: 'un autre nom pour le sous-programme',
        steps: [subProgramsList[0].steps[1], subProgramsList[0].steps[0]],
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${blendedSubProgramId.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const subProgramUpdated = await SubProgram.findById(blendedSubProgramId);

      expect(response.statusCode).toBe(200);
      expect(subProgramUpdated.name).toEqual(payload.name);
      expect(subProgramUpdated.steps[0].toHexString()).toEqual(payload.steps[0].toHexString());
      expect(subProgramUpdated.steps[1].toHexString()).toEqual(payload.steps[1].toHexString());
    });

    it('should return a 400 if payload is empty', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${blendedSubProgramId.toHexString()}`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should publish blended subProgram', async () => {
      const payload = { status: 'published' };
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${blendedSubProgramId.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const subProgramUpdated = await SubProgram.findById(blendedSubProgramId).lean();
      expect(subProgramUpdated).toEqual(expect.objectContaining({ _id: blendedSubProgramId, status: 'published' }));
      const countCourse = await Course
        .countDocuments({ subProgram: blendedSubProgramId, format: 'strictly_e_learning' });
      expect(countCourse).toBe(0);
    });

    it('should publish strictly e-learning subProgram, and create 100% e-learning course with accessRules',
      async () => {
        const payload = { status: 'published', accessCompany: authCompany._id };
        const response = await app.inject({
          method: 'PUT',
          url: `/subprograms/${eLearningSubProgramId.toHexString()}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        const subProgramUpdated = await SubProgram.findById(eLearningSubProgramId).lean();
        const countCourse = await Course.countDocuments(
          { subProgram: eLearningSubProgramId, format: 'strictly_e_learning', accessRules: [payload.accessCompany] }
        );

        expect(response.statusCode).toBe(200);
        expect(countCourse).toBe(1);
        expect(subProgramUpdated).toEqual(expect.objectContaining({ _id: eLearningSubProgramId, status: 'published' }));
      });

    it('should return a 403 trying to publish with empty step',
      async () => {
        const subProgramId = subProgramsList[5]._id;
        const payload = { status: 'published', accessCompany: authCompany._id };
        const response = await app.inject({
          method: 'PUT',
          url: `/subprograms/${subProgramId.toHexString()}`,
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(403);
      });

    it('should return a 403 trying to publish with empty activity',
      async () => {
        const subProgramId = subProgramsList[6]._id;
        const payload = { status: 'published', accessCompany: authCompany._id };
        const response = await app.inject({
          method: 'PUT',
          url: `/subprograms/${subProgramId.toHexString()}`,
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(403);
      });

    it('should return a 400 if user tries to publish strictly e-learning subProgram with wrong accessCompany',
      async () => {
        const payload = { status: 'published', accessCompany: new ObjectID() };
        const response = await app.inject({
          method: 'PUT',
          url: `/subprograms/${eLearningSubProgramId.toHexString()}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });

    it('should return 400 if setting status to draft ', async () => {
      const payload = { status: 'draft' };
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${eLearningSubProgramId.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if name is empty', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${blendedSubProgramId.toHexString()}`,
        payload: { name: '' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if steps is empty', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${blendedSubProgramId.toHexString()}`,
        payload: { steps: [] },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if status is not a status type', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${blendedSubProgramId.toHexString()}`,
        payload: { status: 'qwertyuiop' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if tryinig to update status and name at the same time', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${blendedSubProgramId.toHexString()}`,
        payload: { name: 'new name', status: 'draft' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 if trying to update a subprogram with status published', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${subProgramsList[2]._id.toHexString()}`,
        payload: { name: 'qwertyuiop' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 400 if step is not from subprogram', async () => {
      const payload = { steps: [subProgramsList[0].steps[1], subProgramsList[0].steps[0]] };
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${subProgramsList[1]._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 if a published eLearning subprogram already exist in program', async () => {
      const payload = { status: 'published' };
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${subProgramsList[3]._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return a 403 if subprogram is invalid', async () => {
      const payload = { status: 'published' };
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${subProgramsList[4]._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = { name: 'un autre nom pour le sous-programme' };
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          payload,
          url: `/subprograms/${blendedSubProgramId.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('SUBPROGRAMS ROUTES - POST /subprograms/{_id}/step', () => {
  let authToken;
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
        headers: { Cookie: `alenvi_token=${authToken}` },
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
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 400 if program does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/subprograms/${new ObjectID()}/steps`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if trying to add step to a subprogram with status published', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/subprograms/${subProgramsList[2]._id.toHexString()}/steps`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
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
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('SUBPROGRAMS ROUTES - DELETE /subprograms/{_id}/step/{stepId}', () => {
  let authToken;
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
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      await SubProgram.findById(subProgramId);

      expect(response.statusCode).toBe(200);
      const subProgramUpdated = await SubProgram.findOne({ _id: subProgramId }).lean();
      expect(subProgramUpdated.steps.length).toEqual(stepsLengthBefore - 1);
      expect(subProgramUpdated.steps.some(step => step._id === subProgramsList[0].steps[0]._id)).toBeFalsy();
    });

    it('should return a 404 if subprogram does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/subprograms/${new ObjectID()}/steps/${subProgramsList[0].steps[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if subprogram does not contain step', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/subprograms/${subProgramsList[0]._id}/steps/${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if trying to remove step to a subprogram with status published', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/subprograms/${subProgramsList[2]._id}/steps/${subProgramsList[2].steps[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 409 step is linked to a courseSlot', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/subprograms/${subProgramsList[7]._id}/steps/${subProgramsList[7].steps[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
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
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('SUBPROGRAMS ROUTES - GET /subprograms/draft-e-learning', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get all draft and e-learning subprograms', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/subprograms/draft-e-learning',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.subPrograms.length).toEqual(2);
      const { subPrograms } = response.result.data;
      const stepsIds = subPrograms[0].steps.map(step => step._id);
      const steps = await Step.find({ _id: { $in: stepsIds } }).lean();
      expect(steps.every(step => step.type === 'e_learning')).toBeTruthy();
    });
  });

  describe('Other roles', () => {
    it('should get draft and e-learning subprograms for which user is a tester', async () => {
      authToken = await getTokenByCredentials(tester.local);
      const response = await app.inject({
        method: 'GET',
        url: '/subprograms/draft-e-learning',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.subPrograms.length).toEqual(1);
      const { subPrograms } = response.result.data;
      const stepsIds = subPrograms[0].steps.map(step => step._id);
      const eLearningSteps = await Step.countDocuments({ type: E_LEARNING, _id: { $in: stepsIds } });
      expect(eLearningSteps).toEqual(stepsIds.length);
    });

    const roles = ['helper', 'client_admin', 'trainer'];

    roles.forEach((role) => {
      it(`should return an empty array if ${role} is not a tester`, async () => {
        authToken = await getToken(role);
        const response = await app.inject({
          method: 'GET',
          url: '/subprograms/draft-e-learning',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.subPrograms.length).toEqual(0);
      });
    });
  });
});

describe('SUBPROGRAMS ROUTES - GET /subprograms/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get subprogram', async () => {
      const subProgramId = subProgramsList[3]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/subprograms/${subProgramId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.subProgram).toMatchObject({
        _id: subProgramId,
        name: 'subProgram 4',
        status: 'draft',
        program: { name: 'program 2' },
        steps: [
          { _id: stepsList[2]._id, name: 'step 3', type: 'e_learning', activities: [activitiesList[0]] },
        ],
      });
    });

    it('should return 400 if ID is null', async () => {
      const subProgramId = null;
      const response = await app.inject({
        method: 'GET',
        url: `/subprograms/${subProgramId}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if subprogram does not exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/subprograms/${new ObjectID()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should get subprogram if user is tester', async () => {
      authToken = await getTokenByCredentials(tester.local);
      const subProgramId = subProgramsList[3]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/subprograms/${subProgramId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.subProgram).toMatchObject({
        _id: subProgramId,
        name: 'subProgram 4',
        status: 'draft',
        program: { name: 'program 2' },
        steps: [
          { _id: stepsList[2]._id, name: 'step 3', type: 'e_learning', activities: [activitiesList[0]] },
        ],
      });
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} if ${role.name} is not allowed to access this subprogram`, async () => {
        authToken = await getToken(role.name);
        const subProgramId = subProgramsList[0]._id;
        const response = await app.inject({
          method: 'GET',
          url: `/subprograms/${subProgramId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
