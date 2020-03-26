const expect = require('expect');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { populateDB, coursesList, courseSlotsList } = require('./seed/courseSlotsSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSE SLOTS ROUTES - POST /courseslots', () => {
  let token;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should create course slot', async () => {
      const payload = {
        startDate: '2020-03-04T09:00:00',
        endDate: '2020-03-04T11:00:00',
        courseId: coursesList[0]._id,
        address: {
          street: '37 rue de Ponthieu',
          zipCode: '75008',
          city: 'Paris',
          fullAddress: '37 rue de Ponthieu 75008 Paris',
          location: { type: 'Point', coordinates: [2.0987, 1.2345] },
        },
      };
      const response = await app.inject({
        method: 'POST',
        url: '/courseslots',
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    const missingParams = [
      { path: 'startDate' },
      { path: 'endDate' },
      { path: 'courseId' },
      { path: 'address.fullAddress' },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const payload = {
          startDate: '2020-03-04T09:00:00',
          endDate: '2020-03-04T11:00:00',
          courseId: coursesList[0]._id,
          address: {
            street: '37 rue de Ponthieu',
            zipCode: '75008',
            city: 'Paris',
            fullAddress: '37 rue de Ponthieu 75008 Paris',
            location: { type: 'Point', coordinates: [2.0987, 1.2345] },
          },
        };
        const response = await app.inject({
          method: 'POST',
          url: '/courseslots',
          payload: omit({ ...payload }, test.path),
          headers: { 'x-access-token': token },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = {
          startDate: '2020-03-04T09:00:00',
          endDate: '2020-03-04T11:00:00',
          courseId: coursesList[0]._id,
        };
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/courseslots',
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSE SLOTS ROUTES - PUT /courseslots/{_id}', () => {
  let token;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should update course slot', async () => {
      const payload = {
        startDate: '2020-03-04T09:00:00',
        endDate: '2020-03-04T11:00:00',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/courseslots/${courseSlotsList[0]._id}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if slot not found', async () => {
      const payload = {
        startDate: '2020-03-04T09:00:00',
        endDate: '2020-03-04T11:00:00',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/courseslots/${new ObjectID()}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    const missingParams = [
      { path: 'startDate' },
      { path: 'endDate' },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const payload = {
          startDate: '2020-03-04T09:00:00',
          endDate: '2020-03-04T11:00:00',
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/courseslots/${courseSlotsList[0]._id}`,
          headers: { 'x-access-token': token },
          payload: omit({ ...payload }, test.path),
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = { startDate: '2020-03-04T09:00:00', endDate: '2020-03-04T11:00:00' };
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/courseslots/${courseSlotsList[0]._id}`,
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - DELETE /courses/{_id}', () => {
  let token;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should delete course slot', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courseslots/${courseSlotsList[0]._id}`,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if slot not found', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courseslots/${new ObjectID()}`,
        headers: { 'x-access-token': token },
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
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courseslots/${courseSlotsList[0]._id}`,
          headers: { 'x-access-token': token },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
