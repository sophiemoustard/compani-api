const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const {
  populateDB,
  activitiesList,
  activityHistoriesUsersList,
} = require('./seed/activityHistoriesSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ACTIVITY HISTORIES ROUTES - POST /activityhistories/', () => {
  let authToken = null;
  const payload = [
    { user: activityHistoriesUsersList[0], activity: activitiesList[0]._id },
    { user: new ObjectID(), activity: activitiesList[0]._id },
    { user: activityHistoriesUsersList[0], activity: new ObjectID() },
    { user: activityHistoriesUsersList[1], activity: activitiesList[0]._id },
  ];

  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create activityHistory', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: payload[0].user, activity: payload[0].activity },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 400 if no user in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { activity: payload[0].activity },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if no activity in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: payload[0].user },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 401 if user is not connected', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: payload[0].user, activity: payload[0].activity },
        headers: { 'x-access-token': '' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return a 404 if user doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: payload[1].user, activity: payload[1].activity },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if activity doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: payload[2].user, activity: payload[2].activity },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if user doesn\'t follow course where activity', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: payload[3].user, activity: payload[3].activity },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
      { name: 'helper', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 200 },
      { name: 'vendor_admin', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/activityhistories',
          payload: { user: payload[0].user, activity: activitiesList[0]._id },
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
