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

describe('COMPANIES ROUTES', () => {
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
