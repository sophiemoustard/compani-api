const expect = require('expect');
const { ObjectID } = require('mongodb');

const app = require('../../server');
const Sector = require('../../models/Sector');
const { getToken } = require('./seed/usersSeed');
const { populateSectors, sectorsList } = require('./seed/sectorsSeed');
const { companiesList } = require('./seed/companiesSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SECTORS ROUTES', () => {
  let authToken = null;
  beforeEach(populateSectors);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('POST /sectors', () => {
    it('should create a new company sector', async () => {
      const initialSectorNumber = sectorsList.length;

      const payload = { name: 'Test3', company: companiesList[0]._id };
      const response = await app.inject({
        method: 'POST',
        url: '/sectors',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const sectors = await Sector.find();
      expect(sectors.length).toEqual(initialSectorNumber + 1);
    });
    it("should return a 400 error if 'name' params is missing", async () => {
      const payload = { company: companiesList[0]._id };
      const response = await app.inject({
        method: 'POST',
        url: '/sectors',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });
    it("should return a 400 error if 'companyId' params is missing", async () => {
      const payload = { name: 'Test3' };
      const response = await app.inject({
        method: 'POST',
        url: '/sectors',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /sectors', () => {
    it('should get sectors', async () => {
      const sectorNumber = sectorsList.length;

      const response = await app.inject({
        method: 'GET',
        url: '/sectors',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sectors.length).toEqual(sectorNumber);
    });
  });

  describe('PUT /sectors/:id', () => {
    it('should update a sector', async () => {
      const sector = sectorsList[0];

      const payload = { name: 'SuperTest' };
      const response = await app.inject({
        method: 'PUT',
        url: `/sectors/${sector._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
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
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /sectors/:id', () => {
    it('should delete a sector', async () => {
      const sector = sectorsList[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/sectors/${sector._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(200);
    });
    it('should return a 404 error if sector does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/sectors/${new ObjectID().toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
