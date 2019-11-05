const expect = require('expect');
const { ObjectID } = require('mongodb');
const { company, populateDB } = require('./seed/companiesSeed');
const Company = require('../../src/models/Company');
const app = require('../../server');
const { getToken, authCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COMPANIES ROUTES', () => {
  let authToken = null;
  describe('PUT /companies/:id', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should update company service', async () => {
        const payload = {
          name: 'Alenvi Alenvi',
          rhConfig: { feeAmount: 70 },
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${authCompany._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.company.name).toEqual(payload.name);
      });

      it('should return 403 if no company found', async () => {
        const invalidId = authCompany._id.toHexString();
        const payload = {
          name: 'Alenvi Alenvi',
        };
        await Company.deleteMany({});
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${invalidId}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });

      it('should return 403 if not the same ids', async () => {
        const invalidId = company._id.toHexString();
        const payload = {
          name: 'Alenvi Alenvi',
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${invalidId}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('Other role', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const payload = { name: 'SuperTest' };
          const response = await app.inject({
            method: 'PUT',
            url: `/companies/${company._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('COMPANIES INTERNAL HOURS ROUTES', () => {
  let authToken = null;
  describe('GET /companies/{_id}/internalHours', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

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

    describe('Other role', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/companies/${company._id.toHexString()}/internalHours`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('POST /companies/{_id}/internalHours', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

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

    describe('Other role', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const payload = { name: 'Gros run' };
          const response = await app.inject({
            method: 'POST',
            url: `/companies/${company._id.toHexString()}/internalHours`,
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT /comapnies/{_id}/internalHours/{internalHoursId}', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

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

    describe('Other role', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const payload = { default: true };
          const internalHour = company.rhConfig.internalHours[0];
          const response = await app.inject({
            method: 'PUT',
            url: `/companies/${company._id.toHexString()}/internalHours/${internalHour._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /companies/{_id}/internalHours/{internalHourId}', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

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

    describe('Other role', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const internalHour = company.rhConfig.internalHours[0];
          const response = await app.inject({
            method: 'DELETE',
            url: `/companies/${company._id.toHexString()}/internalHours/${internalHour._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});
