const expect = require('expect');
const app = require('../../server');
const { populateDB, questionnairesList } = require('./seed/questionnairesSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('QUESTIONNAIRES ROUTES - POST /questionnaires', () => {
  let authToken;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create questionnaire', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'test', type: 'expectations_collection' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if no name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: '', type: 'expectations_collection' },
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
          method: 'POST',
          url: '/questionnaires',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { title: 'test', type: 'expectations_collection' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('QUESTIONNAIRES ROUTES - GET /questionnaires', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get all questionnaires', async () => {
      const questionnairesNumber = questionnairesList.length;
      const response = await app.inject({
        method: 'GET',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.questionnaires.length).toEqual(questionnairesNumber);
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
          method: 'GET',
          url: '/questionnaires',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
