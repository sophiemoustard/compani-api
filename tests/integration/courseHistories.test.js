const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const {
  populateDB,
  coursesList,
  courseHistoriesList,
} = require('./seed/courseHistoriesSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSE HISTORIES ROUTES - GET /coursehistories/', () => {
  let authToken = null;

  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return all courseHistories from course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[0]._id}`,
        headers: { 'x-access-token': authToken },
      });

      const courseHistoriesFromCourse = courseHistoriesList.filter(ch => ch.course === coursesList[0]._id);

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courseHistories).toBeDefined();
      expect(response.result.data.courseHistories.length).toEqual(courseHistoriesFromCourse.length);
    });

    it('should return all 400 if no query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/coursehistories',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return empty array if wrong query', async () => { // PAS SUR DE CE TEST
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${new ObjectID().toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courseHistories).toBeDefined();
      expect(response.result.data.courseHistories.length).toEqual(0);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 200 },
      { name: 'vendor_admin', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/coursehistories?course=${coursesList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
