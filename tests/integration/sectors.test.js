const { expect } = require('expect');
const app = require('../../server');
const Sector = require('../../src/models/Sector');
const { populateDB, sectorsList, userFromOtherCompany } = require('./seed/sectorsSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany, otherCompany } = require('../seed/authCompaniesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SECTORS ROUTES - POST /sectors', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a new company sector if name doesn\'t exist in company', async () => {
      authToken = await getTokenByCredentials(userFromOtherCompany.local);
      const payload = { name: sectorsList[2].name };
      const response = await app.inject({
        method: 'POST',
        url: '/sectors',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sector.company).toEqual(otherCompany._id);
    });

    it('should return a 400 error if \'name\' params is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sectors',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 error if sector name already exists in company', async () => {
      const payload = { name: sectorsList[0].name };
      const response = await app.inject({
        method: 'POST',
        url: '/sectors',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const payload = { name: 'Test3', company: authCompany._id };
        const response = await app.inject({
          method: 'POST',
          url: '/sectors',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('SECTORS ROUTES - GET /sectors', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get sectors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/sectors',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sectors.length).toEqual(3);
      expect(response.result.data.sectors[0].hasAuxiliaries).toBeDefined();
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
          url: '/sectors',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('SECTORS ROUTES - PUT /sectors/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should update a sector if sector name doesn\'t exist in company', async () => {
      authToken = await getTokenByCredentials(userFromOtherCompany.local);
      const sector = sectorsList[1];

      const payload = { name: sectorsList[2].name };
      const response = await app.inject({
        method: 'PUT',
        url: `/sectors/${sector._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.updatedSector).toMatchObject(payload);
    });

    it('should return a 404 error if sector does not exist in company', async () => {
      const payload = { name: 'SuperTest' };
      const response = await app.inject({
        method: 'PUT',
        url: `/sectors/${sectorsList[1]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 409 error if sector name already exists in company', async () => {
      const sector = sectorsList[0];
      const payload = { name: sectorsList[2].name };
      const response = await app.inject({
        method: 'PUT',
        url: `/sectors/${sector._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const payload = { name: 'SuperTest' };
        const sector = sectorsList[0];
        const response = await app.inject({
          method: 'PUT',
          url: `/sectors/${sector._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('SECTORS ROUTES - DELETE /sectors/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete a sector', async () => {
      const sector = sectorsList[2];

      const response = await app.inject({
        method: 'DELETE',
        url: `/sectors/${sector._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const sectorsCount = await Sector.countDocuments({ _id: sector._id });
      expect(sectorsCount).toBe(0);
    });

    it('should return 403 if has auxiliaries', async () => {
      const sector = sectorsList[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/sectors/${sector._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('should return 404 if not in same company', async () => {
      const sector = sectorsList[1];

      const response = await app.inject({
        method: 'DELETE',
        url: `/sectors/${sector._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const sector = sectorsList[0];
        const response = await app.inject({
          method: 'DELETE',
          url: `/sectors/${sector._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
