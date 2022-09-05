const expect = require('expect');
const app = require('../../server');
const InternalHour = require('../../src/models/InternalHour');
const Event = require('../../src/models/Event');
const {
  populateDB,
  internalHoursList,
  authInternalHoursList,
  internalHourUsers,
} = require('./seed/internalHoursSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('INTERNAL HOURS ROUTES - POST /internalhours', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a new company internal hour', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/internalhours',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Test3' },
      });

      expect(response.statusCode).toBe(200);
      const internalHoursCount = await InternalHour.countDocuments({ company: authCompany._id });
      expect(internalHoursCount).toEqual(authInternalHoursList.length + 1);
    });

    it('should return a 403 error if company internal hours reach limits', async () => {
      await InternalHour.insertMany([
        { name: 'Koko', company: authCompany._id },
        { name: 'Nut', company: authCompany._id },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/internalhours',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Test3' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 400 error if \'name\' params is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/internalhours',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
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
        const response = await app.inject({
          method: 'POST',
          url: '/internalhours',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { name: 'Test3' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('INTERNAL HOURS ROUTES - GET /internalhours', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get internal hours (company A)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/internalhours',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.internalHours.length).toEqual(authInternalHoursList.length);
    });

    it('should get internal hours (company B)', async () => {
      authToken = await getTokenByCredentials(internalHourUsers[0].local);
      const response = await app.inject({
        method: 'GET',
        url: '/internalhours',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.internalHours.length).toEqual(internalHoursList.length);
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
          url: '/internalhours',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('INTERNAL HOURS ROUTES - DELETE /internalhours/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete an internal hour', async () => {
      const internalHour = authInternalHoursList[1];
      const response = await app.inject({
        method: 'DELETE',
        url: `/internalhours/${internalHour._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const internalHoursCount = await InternalHour.countDocuments({ company: authCompany._id });
      expect(internalHoursCount).toBe(authInternalHoursList.length - 1);

      const deletedInternalHourEventsCount = await Event.countDocuments({ internalHour: internalHour._id });
      expect(deletedInternalHourEventsCount).toBe(0);
    });

    it('should return 404 if not in same company', async () => {
      authToken = await getToken('client_admin');
      const internalHour = internalHoursList[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/internalhours/${internalHour._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if internal hour is used in an event', async () => {
      const internalHour = authInternalHoursList[0];
      const response = await app.inject({
        method: 'DELETE',
        url: `/internalhours/${internalHour._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
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
        const internalHour = authInternalHoursList[1];
        const response = await app.inject({
          method: 'DELETE',
          url: `/internalhours/${internalHour._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
