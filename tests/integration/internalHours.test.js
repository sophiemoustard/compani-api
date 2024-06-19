const { expect } = require('expect');
const app = require('../../server');
const {
  populateDB,
  internalHoursList,
  authInternalHoursList,
  internalHourUsers,
} = require('./seed/internalHoursSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('INTERNAL HOURS ROUTES - GET /internalhours', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get internal hours (company A)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/internalhours',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.internalHours.length).toEqual(authInternalHoursList.length);
    });

    it('should get internal hours (company B)', async () => {
      authToken = await getTokenByCredentials(internalHourUsers[0].local);
      const response = await app.inject({
        method: 'GET',
        url: '/internalhours',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.internalHours.length).toEqual(internalHoursList.length);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/internalhours',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
