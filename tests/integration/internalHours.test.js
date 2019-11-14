const expect = require('expect');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const sinon = require('sinon');

const app = require('../../server');
const InternalHour = require('../../src/models/InternalHour');
const EventsHelper = require('../../src/helpers/events');
const {
  populateDB,
  internalHoursList,
  authInternalHoursList,
  internalHourUser,
} = require('./seed/internalHoursSeed');
const { getToken, authCompany, getTokenByCredentials } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('INTERNAL HOURS ROUTES', () => {
  let authToken = null;

  describe('POST /internalhours', () => {
    const payload = { name: 'Test3', default: false };
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should create a new company internal hour', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/internalhours',
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.internalHour).toBeDefined();
        const internalHours = await InternalHour.find({ company: authCompany._id });
        expect(internalHours.length).toEqual(authInternalHoursList.length + 1);
      });

      it('should return a 403 error if company internal hours reach limits', async () => {
        await InternalHour.insertMany([
          { name: 'Koko', default: false, company: authCompany._id },
          { name: 'Nut', default: false, company: authCompany._id },
        ]);

        const response = await app.inject({
          method: 'POST',
          url: '/internalhours',
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });

      it("should return a 400 error if 'name' params is missing", async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/internalhours',
          headers: { 'x-access-token': authToken },
          payload: omit({ ...payload }, 'name'),
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: '/internalhours',
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /internalhours', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
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
        authToken = await getTokenByCredentials(internalHourUser.local);
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

  describe('PUT /internalhours/:id', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should update an internal hour', async () => {
        const internalHour = authInternalHoursList[0];
        const payload = { default: false };

        const response = await app.inject({
          method: 'PUT',
          url: `/internalhours/${internalHour._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.internalHour).toMatchObject(payload);
      });

      it('should return a 404 error if internalHour does not exist', async () => {
        const payload = { default: false };
        const response = await app.inject({
          method: 'PUT',
          url: `/internalhours/${new ObjectID().toHexString()}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(404);
      });

      it('should return a 403 error if internal hour company is not from user company', async () => {
        const internalHour = internalHoursList[0];
        const payload = { default: false };
        const response = await app.inject({
          method: 'PUT',
          url: `/internalhours/${internalHour._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const payload = { name: 'SuperTest' };
          const internalHour = authInternalHoursList[0];
          const response = await app.inject({
            method: 'PUT',
            url: `/internalhours/${internalHour._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /internalhours/:id', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should delete an internal hour', async () => {
        const internalHour = authInternalHoursList[1];
        const defaultInternalHour = authInternalHoursList.find(ih => ih.default);
        const updateEventsInternalHourTypeStub = sinon.stub(EventsHelper, 'updateEventsInternalHourType');

        const response = await app.inject({
          method: 'DELETE',
          url: `/internalhours/${internalHour._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });
        expect(response.statusCode).toBe(200);
        sinon.assert.calledWith(updateEventsInternalHourTypeStub, sinon.match.date, internalHour._id, sinon.match(defaultInternalHour));
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
          headers: { 'x-access-token': authToken },
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
