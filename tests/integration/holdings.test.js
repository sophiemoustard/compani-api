const { expect } = require('expect');
const app = require('../../server');
const Holding = require('../../src/models/Holding');
const { populateDB } = require('./seed/holdingsSeed');
const { getToken } = require('./helpers/authentication');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('HOLDINGS ROUTES - POST /holdings', () => {
  let authToken;
  describe('TRAINING_ORGANISATION_MANAGER', () => {
    const payload = { name: 'Holding SARL', address: '24 avenue Daumesnil 75012 Paris' };

    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create a new holding', async () => {
      const holdingsBefore = await Holding.countDocuments();

      const response = await app.inject({
        method: 'POST',
        url: '/holdings',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const holdingsCount = await Holding.countDocuments();
      expect(holdingsCount).toEqual(holdingsBefore + 1);
    });

    it('should return 409 if other holding has exact same name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/holdings',
        payload: { name: 'Test' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 409 if other holding has same name (case and diacritics insensitive)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/holdings',
        payload: { name: 'TèsT' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return a 400 error if missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/holdings',
        payload: { address: '24 avenue Daumesnil 75012 Paris' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const payload = { name: 'Holding SARL' };

    beforeEach(populateDB);

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
          method: 'POST',
          url: '/holdings',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('HOLDINGS ROUTES - GET /holdings', () => {
  let authToken;
  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(populateDB);

    it('should list holdings', async () => {
      authToken = await getToken('training_organisation_manager');
      const response = await app.inject({
        method: 'GET',
        url: '/holdings',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.holdings.length).toEqual(1);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

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
          url: '/holdings',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
