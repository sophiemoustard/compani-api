const expect = require('expect');
const { ObjectID } = require('mongodb');
const { companiesList, populateCompanies } = require('./seed/companiesSeed');
const { getToken } = require('./seed/usersSeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COMPANIES ROUTES', () => {
  let authToken = null;
  before(populateCompanies);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /companies/:id', () => {
    it('should return company', async () => {
      const company = companiesList[0];
      const response = await app.inject({
        method: 'GET',
        url: `/companies/${company._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.company).toBeDefined();
    });

    it('should return 404 if no company found', async () => {
      const invalidId = new ObjectID().toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/companies/${invalidId}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /companies', () => {
    it('should create a new service', async () => {
      const payload = {
        name: 'Alenvi',
      };
      const response = await app.inject({
        method: 'POST',
        url: '/companies',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.company.name).toBe('Alenvi');
    });
  });

  describe('PUT /companies/:id', () => {
    it('should update company service', async () => {
      const company = companiesList[0];
      const payload = {
        name: 'Alenvi Alenvi',
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

  describe('DELETE /companies/:id', () => {
    it('should delete company service', async () => {
      const company = companiesList[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/companies/${company._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

describe('COMPANIES SERVICES ROUTES', () => {
  let authToken = null;
  before(populateCompanies);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('POST /companies/:id/services', () => {
    it('should create a new service', async () => {
      const company = companiesList[0];
      const initialServicesNumber = company.customersConfig.services.length;

      const payload = {
        defaultUnitAmount: 12,
        eveningSurcharge: '',
        holidaySurcharge: '',
        name: 'Service',
        nature: 'Service',
        vat: 12,
      };
      const response = await app.inject({
        method: 'POST',
        url: `/companies/${company._id.toHexString()}/services`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.services.length).toEqual(initialServicesNumber + 1);
    });
  });

  describe('GET /companies/:id/services', () => {
    it('should return company services', async () => {
      const company = companiesList[0];
      const response = await app.inject({
        method: 'GET',
        url: `/companies/${company._id.toHexString()}/services`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.services).toBeDefined();
    });

    it('should return 404 if no company found', async () => {
      const invalidId = new ObjectID().toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/companies/${invalidId}/services`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /companies/:id/services/:serviceId', () => {
    it('should update company service', async () => {
      const company = companiesList[0];
      const service = company.customersConfig.services[0];
      const payload = {
        defaultUnitAmount: 15,
        eveningSurcharge: '',
        holidaySurcharge: '',
        name: 'Service bis',
        nature: 'Service bis',
        vat: 12,
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/companies/${company._id.toHexString()}/services/${service._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.services[0].name).toEqual(payload.name);
    });

    it('should return 404 if no company found', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        defaultUnitAmount: 15,
        eveningSurcharge: '',
        holidaySurcharge: '',
        name: 'Service bis',
        nature: 'Service bis',
        vat: 12,
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/companies/${invalidId}/services`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /companies/:id/services/:serviceId', () => {
    it('should delete company service', async () => {
      const company = companiesList[0];
      const service = company.customersConfig.services[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/companies/${company._id.toHexString()}/services/${service._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

describe('COMPANIES INTERNAL HOURS ROUTES', () => {
  let authToken = null;
  before(populateCompanies);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /companies/{_id}/internalHours', () => {
    it('should return company internal hours', async () => {
      const company = companiesList[0];
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
      const company = companiesList[0];
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
      const company = companiesList[0];
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
      const company = companiesList[0];
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
      const company = companiesList[0];
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
      const company = companiesList[0];
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
      const company = companiesList[0];
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
      const company = companiesList[0];
      const internalHour = company.rhConfig.internalHours.find(hour => !hour.default);
      const response = await app.inject({
        method: 'DELETE',
        url: `/companies/${company._id.toHexString()}/internalHours/${internalHour._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 403 error if delete default internal hour', async () => {
      const company = companiesList[0];
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
