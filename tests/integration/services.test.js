const expect = require('expect');
const { ObjectID } = require('mongodb');

const { servicesList, populateServices } = require('./seed/servicesSeed');
const { getToken } = require('./seed/usersSeed');
const Service = require('../../models/Service');
const app = require('../../server');

describe('SERVICES ROUTES', () => {
  let authToken = null;
  beforeEach(populateServices);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('POST /services', () => {
    it('should create a new service', async () => {
      const payload = {
        company: new ObjectID(),
        versions: [{
          defaultUnitAmount: 12,
          eveningSurcharge: '',
          holidaySurcharge: '',
          name: 'Service',
          vat: 12,
        }],
        nature: 'Service',
      };
      const response = await app.inject({
        method: 'POST',
        url: '/services',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const services = await Service.find();
      expect(services.length).toEqual(servicesList.length + 1);
    });
  });

  describe('GET /services', () => {
    it('should return services', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.services.length).toBe(servicesList.length);
    });
  });

  describe('PUT /services/:id', () => {
    it('should update service', async () => {
      const payload = {
        defaultUnitAmount: 15,
        eveningSurcharge: '',
        holidaySurcharge: '',
        name: 'Service bis',
        startDate: '2019-01-16 17:58:15.519',
        vat: 12,
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/services/${servicesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.updatedService.versions).toBeDefined();
      expect(response.result.data.updatedService.versions.length).toBe(servicesList[0].versions.length + 1);
      const service = await Service.findById(servicesList[0]._id);
      expect(response.result.data.updatedService.versions.length).toBe(service.versions.length);
    });

    it('should return 404 if no service found', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        defaultUnitAmount: 15,
        eveningSurcharge: '',
        holidaySurcharge: '',
        name: 'Service bis',
        startDate: '2019-01-16 17:58:15.519',
        vat: 12,
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/services/${invalidId}`,
        headers: { 'x-access-token': authToken },
        payload,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /services/:id', () => {
    it('should delete service', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/services/${servicesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const services = await Service.find();
      expect(services.length).toBe(servicesList.length - 1);
    });
  });
});
