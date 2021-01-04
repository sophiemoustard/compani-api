const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { populateDB, sectorsList } = require('./seed/sectorsSeed');
const { getToken, authCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('POST /sectors', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a new company sector', async () => {
      const payload = { name: 'Test3' };
      const response = await app.inject({
        method: 'POST',
        url: '/sectors',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sector.company).toEqual(authCompany._id);
    });

    it('should return a 400 error if \'name\' params is missing', async () => {
      const payload = { company: authCompany._id };
      const response = await app.inject({
        method: 'POST',
        url: '/sectors',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 error if sector name already exists', async () => {
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
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
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

describe('GET /sectors', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should get sectors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/sectors',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sectors.length).toEqual(3);
      expect(response.result.data.sectors[0].hasAuxiliaries).toBeTruthy();
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
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

describe('PUT /sectors/:id', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should update a sector', async () => {
      const sector = sectorsList[0];

      const payload = { name: 'SuperTest' };
      const response = await app.inject({
        method: 'PUT',
        url: `/sectors/${sector._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.updatedSector).toMatchObject(payload);
    });

    it('should return a 404 error if sector does not exist', async () => {
      const payload = { name: 'SuperTest' };
      const response = await app.inject({
        method: 'PUT',
        url: `/sectors/${new ObjectID().toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 409 error if sector name already exists', async () => {
      const sector = sectorsList[0];
      const payload = { name: sectorsList[1].name };
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
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
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

describe('DELETE /sectors/:id', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
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

    it('should return 403 if not in same comapny', async () => {
      const sector = sectorsList[1];

      const response = await app.inject({
        method: 'DELETE',
        url: `/sectors/${sector._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('should return a 404 error if sector does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/sectors/${new ObjectID().toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
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
