const { expect } = require('expect');
const { populateDB, balanceCustomerList, customerFromOtherCompany } = require('./seed/balanceSeed');
const { getToken } = require('./helpers/authentication');
const app = require('../../server');
const UtilsHelper = require('../../src/helpers/utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BALANCES ROUTES - GET /', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get all clients balances', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/balances',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.balances).toBeDefined();
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/balances',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BALANCES ROUTES - GET /details', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get all clients balances', async () => {
      const customerId = balanceCustomerList[0]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/balances/details?customer=${customerId}&startDate=2019-10-10&endDate=2019-11-10`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.balances).toBeDefined();
      expect(response.result.data.balances
        .every(b => UtilsHelper.areObjectIdsEquals(b.customer._id, customerId))).toBeTruthy();
      expect(response.result.data.bills).toBeDefined();
      expect(response.result.data.payments).toBeDefined();
      expect(response.result.data.creditNotes).toBeDefined();
    });

    it('should not get all clients balances if customer is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/balances/details?customer=${customerFromOtherCompany._id}&startDate=2019-10-10&endDate=2019-11-10`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/balances/details?customer=${balanceCustomerList[0]._id}&startDate=2019-10-10&endDate=2019-11-10`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
