const expect = require('expect');
const { omit } = require('lodash');
const app = require('../../server');
const { getToken } = require('./helpers/authentication');
const { populateDB } = require('./seed/billingItemsSeed');
const BillingItem = require('../../src/models/BillingItem');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BILLING ITEMS ROUTES - POST /billingitems', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a billing item', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billingitems',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Billing Jean', type: 'manual', defaultUnitAmount: 25, vat: 2 },
      });

      expect(response.statusCode).toBe(200);

      const createdBillingItem = await BillingItem.countDocuments({ name: 'Billing Jean' });
      expect(createdBillingItem).toBe(1);
    });

    const missingParams = ['name', 'type', 'defaultUnitAmount'];
    missingParams.forEach((param) => {
      it(`should return a 400 error if '${param}' payload is missing`, async () => {
        const payload = omit({ name: 'Billing Elliot', type: 'manual', defaultUnitAmount: 25, vat: 2 }, [param]);

        const response = await app.inject({
          method: 'POST',
          url: '/billingitems',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 403 if a billing item with same name exist for company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billingitems',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'An existing billing', type: 'manual', defaultUnitAmount: 25, vat: 2 },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/billingitems',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { name: 'Billing The Kid', type: 'manual', defaultUnitAmount: 25, vat: 2 },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
