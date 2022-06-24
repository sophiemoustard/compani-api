const expect = require('expect');
const { ObjectId } = require('mongodb');
const { auxiliariesIdList, populateDB } = require('./seed/repetitionsSeed');
const { getToken } = require('./helpers/authentication');
const app = require('../../server');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EVENTS ROUTES - GET /repetitions', () => {
  let authToken;
  describe('PLANNING_REFERENT', () => {
    beforeEach(populateDB);
    beforeEach(async () => { authToken = await getToken('planning_referent'); });

    it('should return a list of repetitions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/repetitions?auxiliary=${auxiliariesIdList[0]}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.repetitions.length).toEqual(2);
    });

    it('should return a 404 if auxiliary doesn;t exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/repetitions?auxiliary=${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should returna 400 if auxiliary is missing in query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/repetitions',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'auxiliary', expectedCode: 403, erp: true },
      { name: 'vendor_admin', expectedCode: 403, erp: true },
      { name: 'coach', expectedCode: 200, erp: true },
      { name: 'client_admin', expectedCode: 200, erp: true },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name, role.erp);

        const response = await app.inject({
          method: 'GET',
          url: `/repetitions?auxiliary=${auxiliariesIdList[0]}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
