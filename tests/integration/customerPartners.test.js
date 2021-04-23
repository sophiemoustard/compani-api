const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { getToken, getTokenByCredentials } = require('./seed/authenticationSeed');
const { populateDB, customersList, partnersList, auxiliaryFromOtherCompany } = require('./seed/customerPartnersSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CUSTOMER PARTNERS ROUTES - POST /customerpartners', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should create partner customer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[0]._id, partner: partnersList[0]._id },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if missing customer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { partner: partnersList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if missing partner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if customer has invalid type ', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: 'test', partner: partnersList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if partner has invalid type ', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[0]._id, partner: 'test' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 if customer has wrong company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[1]._id, partner: partnersList[0]._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if partner has wrong company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[0]._id, partner: partnersList[1]._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if user has wrong company', async () => {
      authToken = await getTokenByCredentials(auxiliaryFromOtherCompany.local);
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[0]._id, partner: partnersList[0]._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 409 if customer partner already exists', async () => {
      authToken = await getTokenByCredentials(auxiliaryFromOtherCompany.local);
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[1]._id, partner: partnersList[1]._id },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/customerpartners',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { customer: customersList[0]._id, partner: partnersList[0]._id },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CUSTOMER PARTNERS ROUTES - GET /customerpartners', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should get all partners of a user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/customerpartners?customer=${customersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if query customer has invalid type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/customerpartners?customer=test',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if invalid customer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/customerpartners?customer=${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if customer and user have different companies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/customerpartners?customer=${customersList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/customerpartners?customer=${customersList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
