const expect = require('expect');
const { ObjectID } = require('mongodb');
const { populateDB, authCustomer, customerFromOtherCompany, helpersList } = require('./seed/helpersSeed');
const app = require('../../server');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('GET /helpers', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should return list of helpers', async () => {
      const customerId = authCustomer._id.toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/helpers?customer=${customerId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if invalid customer', async () => {
      const customerId = (new ObjectID()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/helpers?customer=${customerId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if customer from another company', async () => {
      const customerId = customerFromOtherCompany._id.toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/helpers?customer=${customerId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const customerId = authCustomer._id.toHexString();
        const response = await app.inject({
          method: 'GET',
          url: `/helpers?customer=${customerId}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PUT /helpers/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should update referent of helpers', async () => {
      const helperId = helpersList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/helpers/${helperId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { referent: true },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if params is not an id', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/helpers/skusku',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { referent: true },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if payload is not a truthy boolean', async () => {
      const helperId = helpersList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/helpers/${helperId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { referent: false },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const helperId = helpersList[0]._id;
        const response = await app.inject({
          method: 'PUT',
          url: `/helpers/${helperId}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { referent: true },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
