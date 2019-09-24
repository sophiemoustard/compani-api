const expect = require('expect');
const { ObjectID } = require('mongodb');
const { company, populateDB } = require('./seed/companiesSeed');
const app = require('../../server');
const { getToken } = require('./seed/authentificationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COMPANIES ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('coach');
  });

  describe('PUT /companies/:id', () => {
    it('should update company service', async () => {
      const payload = {
        name: 'Alenvi Alenvi',
        rhConfig: { feeAmount: 70 },
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/companies/${company._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.company.name).toEqual(payload.name);
    });

    it('should return 404 if no company found', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        name: 'Alenvi Alenvi',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/companies/${invalidId}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

describe('COMPANIES INTERNAL HOURS ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('coach');
  });

  describe('GET /companies/{_id}/internalHours', () => {
    it('should return company internal hours', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.internalHours).toBeDefined();
      expect(response.result.data.internalHours.length).toEqual(company.rhConfig.internalHours.length);
    });

    it('should return 404 if no company found', async () => {
      const invalidId = new ObjectID().toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/companies/${invalidId}/internalHours`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /companies/{_id}/internalHours', () => {
    it('should create new internal hour', async () => {
      const payload = { name: 'Gros run' };
      const response = await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.internalHours).toBeDefined();
      expect(response.result.data.internalHours.length).toEqual(company.rhConfig.internalHours.length + 1);
    });

    it('should return 404 if no company found', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = { name: 'Gros run' };
      const response = await app.inject({
        method: 'POST',
        url: `/companies/${invalidId}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if invalid payload', async () => {
      const payload = { type: 'Gros run' };
      const response = await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('shold return a 403 error as companyhas already 9 internal hours', async () => {
      await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'Gros run' },
      });
      await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'Dejeuner d\'équipe' },
      });
      await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'Balade à vélo' },
      });
      await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'Atelier peinture' },
      });
      await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'Futsal' },
      });
      await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'Sieste' },
      });
      await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'Apéro' },
      });
      const response = await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/internalHours`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'Raclette' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PUT /comapnies/{_id}/internalHours/{internalHoursId}', () => {
    it('should update internal hour', async () => {
      const payload = { default: true };
      const internalHour = company.rhConfig.internalHours[0];
      const response = await app.inject({
        method: 'PUT',
        url: `/companies/${company._id.toHexString()}/internalHours/${internalHour._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.internalHours).toBeDefined();
      expect(response.result.data.internalHours[0].default).toBeTruthy();
    });

    it('should return 400 if invalid payload', async () => {
      const payload = { type: true };
      const internalHour = company.rhConfig.internalHours[0];
      const response = await app.inject({
        method: 'PUT',
        url: `/companies/${company._id.toHexString()}/internalHours/${internalHour._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if no company found', async () => {
      const invalidId = new ObjectID().toHexString();
      const internalHour = company.rhConfig.internalHours[0];
      const payload = { name: 'Gros run' };
      const response = await app.inject({
        method: 'PUT',
        url: `/companies/${invalidId}/internalHours/${internalHour._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /companies/{_id}/internalHours/{internalHourId}', () => {
    it('should delete internalHour', async () => {
      const internalHour = company.rhConfig.internalHours.find(hour => !hour.default);
      const response = await app.inject({
        method: 'DELETE',
        url: `/companies/${company._id.toHexString()}/internalHours/${internalHour._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 403 error if delete default internal hour', async () => {
      const internalHour = company.rhConfig.internalHours.find(hour => hour.default);
      const response = await app.inject({
        method: 'DELETE',
        url: `/companies/${company._id.toHexString()}/internalHours/${internalHour._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
