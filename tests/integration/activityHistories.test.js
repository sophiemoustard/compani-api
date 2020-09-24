const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const {
  populateDB,
  activitiesList,
  activityHistoriesUsersList,
  cardsList,
} = require('./seed/activityHistoriesSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ACTIVITY HISTORIES ROUTES - POST /activityhistories/', () => {
  let authToken = null;

  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create activityHistory', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: {
          user: activityHistoriesUsersList[0],
          activity: activitiesList[0]._id,
          questionnaireAnswers: [{ card: cardsList[0]._id, answer: 'blabla' }],
        },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should create activityHistory without questionnaireAnswer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: {
          user: activityHistoriesUsersList[0],
          activity: activitiesList[0]._id,
        },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 400 if no user in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { activity: activitiesList[0]._id },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if no activity in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: activityHistoriesUsersList[0] },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 401 if user is not connected', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: activityHistoriesUsersList[0], activity: activitiesList[0]._id },
        headers: { 'x-access-token': '' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return a 404 if user doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: new ObjectID(), activity: activitiesList[0]._id },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if activity doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: activityHistoriesUsersList[0], activity: new ObjectID() },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if user doesn\'t follow course where activity', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: activityHistoriesUsersList[1], activity: activitiesList[0]._id },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if questionnaire answer without card', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: {
          user: activityHistoriesUsersList[0],
          activity: activitiesList[0]._id,
          questionnaireAnswers: [{ answer: 'blabla' }],
        },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if questionnaire answer without answer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: {
          user: activityHistoriesUsersList[0],
          activity: activitiesList[0]._id,
          questionnaireAnswers: [{ card: cardsList[0]._id }],
        },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if card does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: {
          user: activityHistoriesUsersList[0],
          activity: activitiesList[0]._id,
          questionnaireAnswers: [{ card: new ObjectID(), answer: 'blabla' }],
        },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if card not in activity', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: {
          user: activityHistoriesUsersList[0],
          activity: activitiesList[0]._id,
          questionnaireAnswers: [{ card: cardsList[1]._id, answer: 'blabla' }],
        },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 422 if card not a survey', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: {
          user: activityHistoriesUsersList[0],
          activity: activitiesList[0]._id,
          questionnaireAnswers: [{ card: cardsList[2]._id, answer: 'blabla' }],
        },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(422);
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
          payload: { user: activityHistoriesUsersList[0], activity: activitiesList[0]._id },
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
