const expect = require('expect');
const { ObjectID } = require('mongodb');
const { servicesList, serviceFromOtherCompany, populateDB } = require('./seed/servicesSeed');
const Service = require('../../src/models/Service');
const app = require('../../server');
const { CUSTOMER_CONTRACT, HOURLY } = require('../../src/helpers/constants');
const { getToken, authCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SERVICES ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('client_admin');
  });

  describe('POST /services', () => {
    const payload = {
      type: CUSTOMER_CONTRACT,
      versions: [{
        name: 'Service',
        defaultUnitAmount: 12,
        vat: 12,
        exemptFromCharges: true,
        startDate: '2019-09-19T09:00:00',
      }],
      nature: HOURLY,
    };

    it('should create a new service', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const services = await Service.find({ company: authCompany._id });
      expect(services.length).toEqual(servicesList.length + 1);
      expect(response.result.data.service.company).toEqual(authCompany._id);
    });

    const missingParams = [
      {
        paramName: 'type',
        payload: { ...payload },
        remove() {
          delete this.payload[this.paramName];
        },
      },
      {
        paramName: 'defaultUnitAmount',
        payload: { ...payload },
        remove() {
          delete this.payload.versions[0][this.paramName];
        },
      },
      {
        paramName: 'name',
        payload: { ...payload },
        remove() {
          delete this.payload.versions[0][this.paramName];
        },
      },
      {
        paramName: 'nature',
        payload: { ...payload },
        remove() {
          delete this.payload[this.paramName];
        },
      },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.paramName}' parameter`, async () => {
        test.remove();
        const res = await app.inject({
          method: 'POST',
          url: '/services',
          payload: test.payload,
          headers: { 'x-access-token': authToken },
        });
        expect(res.statusCode).toBe(400);
      });
    });

    it('should return a 403 error if user does not have right', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services',
        headers: { 'x-access-token': authToken },
        payload,
        credentials: { scope: ['Test'] },
      });

      expect(response.statusCode).toBe(403);
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

    it('should return a 403 error if user does not have right', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services',
        headers: { 'x-access-token': authToken },
        credentials: { scope: ['Test'] },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PUT /services/:id', () => {
    it('should update service', async () => {
      const payload = {
        defaultUnitAmount: 15,
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
      expect(response.result.data.service.versions).toBeDefined();
      expect(response.result.data.service.versions.length).toBe(servicesList[0].versions.length + 1);
      const service = await Service.findById(servicesList[0]._id);
      expect(response.result.data.service.versions.length).toBe(service.versions.length);
    });

    it('should return 404 if no service found', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        defaultUnitAmount: 15,
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

    it('should return 400 if startDate is missing in payload', async () => {
      const payload = { vat: 12 };
      const response = await app.inject({
        method: 'PUT',
        url: `/services/${servicesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 error if user does not have right', async () => {
      const payload = {
        defaultUnitAmount: 15,
        name: 'Service bis',
        startDate: '2019-01-16 17:58:15.519',
        vat: 12,
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/services/${servicesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
        credentials: { scope: ['Test'] },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if user is not from the same company', async () => {
      const payload = {
        defaultUnitAmount: 15,
        name: 'Service bis',
        startDate: '2019-01-16 17:58:15.519',
        vat: 12,
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/services/${serviceFromOtherCompany._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
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
      const services = await Service.find({ company: authCompany._id });
      expect(services.length).toBe(servicesList.length - 1);
    });

    it('should return a 403 error if user does not have right', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/services/${servicesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        credentials: { scope: ['Test'] },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if user is not from the same company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/services/${serviceFromOtherCompany._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
