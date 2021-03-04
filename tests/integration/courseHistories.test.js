const expect = require('expect');
const moment = require('moment');
const app = require('../../server');
const {
  populateDB,
  coursesList,
  courseHistoriesList,
  trainerAndClientAdmin,
} = require('./seed/courseHistoriesSeed');
const { getToken, getTokenByCredentials } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSE HISTORIES ROUTES - GET /coursehistories', () => {
  let authToken = null;

  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return courseHistories from course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const courseHistoriesFromCourse = courseHistoriesList.filter(ch => ch.course === coursesList[0]._id);

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courseHistories).toBeDefined();
      expect(response.result.data.courseHistories.length).toEqual(courseHistoriesFromCourse.length);
    });

    it('should return courseHistories from course before createAt', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[2]._id}&createdAt=2020-06-25T06:00:00`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const courseHistoriesFromCourse = courseHistoriesList.filter(
        ch => ch.course === coursesList[2]._id && moment(ch.createdAt).isBefore(moment('2020-06-25T06:00:00'))
      );

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courseHistories).toBeDefined();
      expect(response.result.data.courseHistories.length).toEqual(courseHistoriesFromCourse.length);
    });

    it('should return 400 if no query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/coursehistories',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'client_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name} and course is from another company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/coursehistories?course=${coursesList[1]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 200 as user is course trainer', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    it('should return 200 as user is coach and course is intra from coach company', async () => {
      authToken = await getToken('coach');
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    it('should return 200 as user is client_admin and course is intra from client_admin company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    it('should return 403 as user is coach and course is inter_b2b', async () => {
      authToken = await getToken('coach');
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return 403 as user is client_admin and course is inter_b2b', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return 200 as user is trainer, but not course trainer and client_admin', async () => {
      authToken = await getTokenByCredentials(trainerAndClientAdmin.local);
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });
  });
});
