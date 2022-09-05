const expect = require('expect');
const { ObjectId } = require('mongodb');
const { populateDB, customer, customerFromOtherCompany, helpersList } = require('./seed/helpersSeed');
const app = require('../../server');
const { getToken } = require('./helpers/authentication');
const Helper = require('../../src/models/Helper');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('HELPERS ROUTES - GET /helpers', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should return list of helpers', async () => {
      const customerId = customer._id.toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/helpers?customer=${customerId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.helpers.length).toBe(1);
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
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
      { name: 'coach', expectedCode: 200, erp: true },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const customerId = customer._id.toHexString();
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

describe('HELPERS ROUTES - PUT /helpers/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
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

      const helperCount = await Helper.countDocuments({ _id: helperId, referent: true });
      expect(helperCount).toBe(1);
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

    it('should return 404 if helper does not exists', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/helpers/${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { referent: true },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
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
