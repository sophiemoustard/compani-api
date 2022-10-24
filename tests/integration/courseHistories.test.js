const expect = require('expect');
const moment = require('moment');
const app = require('../../server');
const { populateDB, coursesList, courseHistoriesList, userList } = require('./seed/courseHistoriesSeed');
const { trainerAndCoach } = require('../seed/authUsersSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSE HISTORIES ROUTES - GET /coursehistories', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should return courseHistories from course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const courseHistoriesFromCourse = courseHistoriesList.filter(ch => ch.course === coursesList[0]._id);

      expect(response.statusCode).toBe(200);
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
    it('should return 200 as user is course trainer', async () => {
      authToken = await getTokenByCredentials(userList[0].local);
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

    it('should return 403 as user is client_admin and course is inter_b2b', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return 200 as user is coach and trainer, but not course trainer', async () => {
      authToken = await getTokenByCredentials(trainerAndCoach.local);
      const response = await app.inject({
        method: 'GET',
        url: `/coursehistories?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    const roles = [
      { name: 'trainer', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name} and course is from another company`,
        async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/coursehistories?course=${coursesList[1]._id}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
    });
  });
});
