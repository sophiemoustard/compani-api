const expect = require('expect');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
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
  const payload = {
    user: activityHistoriesUsersList[0],
    activity: activitiesList[0]._id,
    questionnaireAnswersList: [
      { card: cardsList[0]._id, answerList: ['blabla'] },
      { card: cardsList[3]._id, answerList: ['blebleble'] },
      { card: cardsList[4]._id, answerList: [new ObjectID(), new ObjectID()] },
      { card: cardsList[5]._id, answerList: [new ObjectID()] },
    ],
    score: 1,
  };

  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create activityHistory', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should create activityHistory without questionnaireAnswersList', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: omit(payload, 'questionnaireAnswersList'),
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 401 if user is not connected', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload,
        headers: { 'x-access-token': '' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return a 404 if user doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { ...payload, user: new ObjectID() },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if activity doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { ...payload, activity: new ObjectID() },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if user doesn\'t follow course where activity', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { user: activityHistoriesUsersList[1], activity: activitiesList[0]._id, score: 9 },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if questionnaire answer without card', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { ...payload, questionnaireAnswersList: [{ answerList: [new ObjectID(), new ObjectID()] }] },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if questionnaire answer without answer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { ...payload, questionnaireAnswersList: [{ card: cardsList[0]._id }] },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if card does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { ...payload, questionnaireAnswersList: [{ card: new ObjectID(), answerList: ['blabla'] }] },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if card not in activity', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { ...payload, questionnaireAnswersList: [{ card: cardsList[1]._id, answerList: ['blabla'] }] },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 422 if card not a survey, an open question or a question/answer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { ...payload, questionnaireAnswersList: [{ card: cardsList[2]._id, answerList: ['blabla'] }] },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(422);
    });

    it('should return 422 if card is a survey and has more than one item in answerList', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { ...payload, questionnaireAnswersList: [{ card: cardsList[0]._id, answerList: ['bla', 'ble'] }] },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(422);
    });

    it('should return 422 if card is a open question and has more than one item in answerList', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: { ...payload, questionnaireAnswersList: [{ card: cardsList[3]._id, answerList: ['bla', 'ble'] }] },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(422);
    });

    it('should return 422 if is a q/a and is not multiplechoice and has more than one item in answerList', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: {
          ...payload,
          questionnaireAnswersList: [{ card: cardsList[5]._id, answerList: [new ObjectID(), new ObjectID()] }],
        },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(422);
    });

    it('should return 422 if is a q/a and items in answerList are not ObjectID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/activityhistories',
        payload: {
          ...payload,
          questionnaireAnswersList: [{ card: cardsList[4]._id, answerList: ['blabla'] }],
        },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(422);
    });

    const missingParams = ['activity', 'user', 'score'];
    missingParams.forEach((param) => {
      it(`should return 400 as ${param} is missing`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/activityhistories',
          payload: omit(payload, param),
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(400);
      });
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
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
