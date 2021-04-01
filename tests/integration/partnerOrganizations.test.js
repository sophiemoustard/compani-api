const expect = require('expect');
const app = require('../../server');
const { populateDB } = require('./seed/partnerOrganizationsSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PARTNER ORGANIZATION ROUTES - POST /partnerorganizations', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should add a partner organization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          name: 'Etchebest Corporation',
          phone: '0123456789',
          email: 'sku@alenvi.io',
          address: {
            fullAddress: '24 avenue Daumesnil 75012 Paris',
            zipCode: '75012',
            city: 'Paris',
            street: '24 avenue Daumesnil',
            location: { type: 'Point', coordinates: [2.377133, 48.801389] },
          },
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if invalid phone', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Etchebest Corporation', phone: 'local' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if invalid address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Etchebest Corporation', address: 'IP' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Etchebest Corporation', email: 'toi de tes affaires' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if name already exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Gooogle' },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/partnerorganizations',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { name: 'Sku Corporation' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
