const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const InternalHour = require('../../src/models/InternalHour');
const Event = require('../../src/models/Event');
const {
  populateDB,
  internalHoursList,
  authInternalHoursList,
  internalHourUsers,
} = require('./seed/internalHoursSeed');
const { getToken, authCompany, getTokenByCredentials, otherCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('INTERNAL HOURS ROUTES', () => {
  let authToken = null;

  describe('POST /internalhours', () => {
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('client_admin');
      });

      it('should create a new company internal hour', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/internalhours',
          headers: { 'x-access-token': authToken },
          payload: { name: 'Test3' },
        });

        expect(response.statusCode).toBe(200);
        const internalHours = await InternalHour.find({ company: authCompany._id });
        expect(internalHours.length).toEqual(authInternalHoursList.length + 1);
      });

      it('should return a 403 error if company internal hours reach limits', async () => {
        await InternalHour.insertMany([
          { name: 'Koko', company: authCompany._id },
          { name: 'Nut', company: authCompany._id },
        ]);

        const response = await app.inject({
          method: 'POST',
          url: '/internalhours',
          headers: { 'x-access-token': authToken },
          payload: { name: 'Test3' },
        });

        expect(response.statusCode).toBe(403);
      });

      it('should return a 400 error if \'name\' params is missing', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/internalhours',
          headers: { 'x-access-token': authToken },
          payload: {},
        });

        expect(response.statusCode).toBe(400);
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
          const response = await app.inject({
            method: 'POST',
            url: '/internalhours',
            headers: { 'x-access-token': authToken },
            payload: { name: 'Test3' },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /internalhours', () => {
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('client_admin');
      });

      it('should get internal hours (company A)', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/internalhours',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.internalHours.length).toEqual(authInternalHoursList.length);
      });

      it('should get internal hours (company B)', async () => {
        authToken = await getTokenByCredentials(internalHourUsers[0].local);
        const response = await app.inject({
          method: 'GET',
          url: '/internalhours',
          headers: { 'x-access-token': authToken },
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
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/internalhours',
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /internalhours/:id', () => {
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getTokenByCredentials(internalHourUsers[0].local);
      });

      it('should delete an internal hour', async () => {
        const internalHour = internalHoursList[1];
        const defaultInternalHour = internalHoursList[0];
        const initialInternalHourEventsCount = await Event.countDocuments({ internalHour: internalHour._id });
        const initialDefaultInternalHourEventsCount =
          await Event.countDocuments({ internalHour: defaultInternalHour._id });

        const response = await app.inject({
          method: 'DELETE',
          url: `/internalhours/${internalHour._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        const internalHoursCount = await InternalHour.countDocuments({ company: otherCompany._id });
        expect(internalHoursCount).toBe(internalHoursList.length - 1);
        const deletedInternalHourEventsCount = await Event.countDocuments({ internalHour: internalHour._id });
        expect(deletedInternalHourEventsCount).toBe(0);
        const defaultInternalHourEventsCount = await Event.countDocuments({ internalHour: defaultInternalHour._id });
        expect(defaultInternalHourEventsCount)
          .toBe(initialDefaultInternalHourEventsCount + initialInternalHourEventsCount);
      });

      it('should return 403 if default internal hour', async () => {
        const internalHour = internalHoursList[0];

        const response = await app.inject({
          method: 'DELETE',
          url: `/internalhours/${internalHour._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(403);
      });

      it('should return 403 if not in same company', async () => {
        const internalHour = internalHoursList[0];

        const response = await app.inject({
          method: 'DELETE',
          url: `/internalhours/${internalHour._id.toHexString()}`,
          headers: { 'x-access-token': await getToken('client_admin') },
        });

        expect(response.statusCode).toBe(403);
      });

      it('should return a 404 error if internal hour does not exist', async () => {
        const response = await app.inject({
          method: 'DELETE',
          url: `/internalhours/${new ObjectID().toHexString()}`,
          headers: { 'x-access-token': authToken },
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
          const internalHour = authInternalHoursList[0];
          const response = await app.inject({
            method: 'DELETE',
            url: `/internalhours/${internalHour._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});
