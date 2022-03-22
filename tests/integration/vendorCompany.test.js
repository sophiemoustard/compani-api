const expect = require('expect');
const app = require('../../server');
const { getToken } = require('./helpers/authentication');
const { populateDB } = require('./seed/vendorCompany');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('VENDOR COMPANY ROUTES - GET /vendorcompany', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get vendor company infos', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/vendorcompany',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data).toMatchObject({
        name: 'Test Company',
        siret: '12345678901234',
        address: {
          fullAddress: '12 rue du test 92160 Antony',
          street: '12 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      });
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
          url: '/vendorcompany',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
