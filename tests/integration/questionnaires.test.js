const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { populateDB, questionnairesList } = require('./seed/questionnairesSeed');
const { getToken, getTokenByCredentials } = require('./seed/authenticationSeed');
const { noRoleNoCompany } = require('../seed/userSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('QUESTIONNAIRES ROUTES - POST /questionnaires', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create questionnaire', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'test', type: 'expectations' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if no title', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: '', type: 'expectations' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if wrong type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'test', type: 'wrong type' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if already exists a draft questionnaire with type EXPECTATIONS', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'test', type: 'expectations' },
      });

      expect(response.statusCode).toBe(200);

      const failedResponse = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'test', type: 'expectations' },
      });

      expect(failedResponse.statusCode).toBe(409);
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
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/questionnaires',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { title: 'test', type: 'expectations' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('QUESTIONNAIRES ROUTES - GET /questionnaires', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get all questionnaires', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.questionnaires.length).toEqual(questionnairesList.length);
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
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/questionnaires',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('QUESTIONNAIRES ROUTES - GET /questionnaires/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get questionnaire', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.questionnaire._id).toEqual(questionnairesList[0]._id);
    });

    it('should return 404 if questionnaire does not exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/questionnaires/${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should return 200 if questionnaire is published', async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);
      const response = await app.inject({
        method: 'GET',
        url: `/questionnaires/${questionnairesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name} and questionnaire is not published`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/questionnaires/${questionnairesList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
