const expect = require('expect');
const app = require('../../server');
const { populateDB, activityHistoriesList } = require('./seed/activityHistoriesSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ACTIVITY HISTORIES ROUTES - POST /activity-histories/', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create activityHistory', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activity-histories',
        payload: { user: activityHistoriesList[0].user, activity: activityHistoriesList[0].activity },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 400 if no user in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activity-histories',
        payload: { activity: activityHistoriesList[0].activity },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if no activity in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activity-histories',
        payload: { user: activityHistoriesList[0].user },
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
          method: 'POST',
          url: '/activity-histories',
          payload: { user: activityHistoriesList[0].user, activity: activityHistoriesList[0].activity },
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
