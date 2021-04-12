const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const Questionnaire = require('../../src/models/Questionnaire');
const Card = require('../../src/models/Card');
const { populateDB, questionnairesList, cardsList } = require('./seed/questionnairesSeed');
const { getToken, getTokenByCredentials } = require('./seed/authenticationSeed');
const { noRoleNoCompany } = require('../seed/userSeed');
const { SURVEY, PUBLISHED, DRAFT } = require('../../src/helpers/constants');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('QUESTIONNAIRES ROUTES - POST /questionnaires', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create questionnaire', async () => {
      await Questionnaire.deleteMany({});

      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'test', type: 'expectations' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if no title', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: '', type: 'expectations' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if wrong type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'test', type: 'wrong type' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if already exists a draft questionnaire with type EXPECTATIONS', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'test', type: 'expectations' },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/questionnaires',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { title: 'test', type: 'expectations' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('QUESTIONNAIRES ROUTES - GET /questionnaires', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get all questionnaires', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/questionnaires',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.questionnaires.length).toEqual(questionnairesList.length);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/questionnaires',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('QUESTIONNAIRES ROUTES - GET /questionnaires/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get questionnaire', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.questionnaire._id).toEqual(questionnairesList[0]._id);
    });

    it('should return 400 if invalid _id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/questionnaires/blabla',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if questionnaire does not exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/questionnaires/${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should return 200 if questionnaire is published', async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);
      const response = await app.inject({
        method: 'GET',
        url: `/questionnaires/${questionnairesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name} and questionnaire is draft`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/questionnaires/${questionnairesList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('QUESTIONNAIRES ROUTES - PUT /questionnaires/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should update questionnaire title', async () => {
      const payload = { title: 'test2' };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update questionnaire title even if questionnaire is published', async () => {
      const payload = { title: 'test2' };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update cards order', async () => {
      const payload = { cards: [questionnairesList[0].cards[1], questionnairesList[0].cards[0]] };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update questionnaire status', async () => {
      await Questionnaire.deleteMany({ _id: questionnairesList[1]._id });

      const payload = { status: PUBLISHED };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if questionnaire status is not PUBLISHED', async () => {
      await Questionnaire.deleteMany({ _id: questionnairesList[1]._id });

      const payload = { status: DRAFT };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if cards is not an array of strings', async () => {
      const payload = { cards: [1, 2] };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if title is not a string', async () => {
      const payload = { title: 123 };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if title is empty', async () => {
      const payload = { title: '' };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if try to update another field', async () => {
      const payload = { type: 'new_type' };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if questionnaire does not exist', async () => {
      const payload = { title: 'test2' };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if cards are not valid', async () => {
      await Questionnaire.deleteMany({ _id: questionnairesList[1]._id });
      await Card.updateMany({ title: 'test1' }, { $set: { title: '' } });

      const payload = { status: PUBLISHED };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 409 if questionnaire with same type is already published', async () => {
      const payload = { status: PUBLISHED };
      const response = await app.inject({
        method: 'PUT',
        url: `/questionnaires/${questionnairesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = { title: 'test2' };
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/questionnaires/${questionnairesList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('QUESTIONNAIRES ROUTES - POST /questionnaires/{_id}/card', () => {
  let authToken = null;
  const questionnaireId = questionnairesList[0]._id;
  beforeEach(populateDB);
  const payload = { template: SURVEY };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create card', async () => {
      const questionnaire = await Questionnaire.findById(questionnaireId).lean();

      const response = await app.inject({
        method: 'POST',
        url: `/questionnaires/${questionnaireId.toHexString()}/cards`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const questionnaireUpdated = await Questionnaire.findById(questionnaireId).lean();

      expect(response.statusCode).toBe(200);
      expect(questionnaireUpdated.cards.length).toEqual(questionnaire.cards.length + 1);
    });

    it('should return a 400 if invalid template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/questionnaires/${questionnaireId.toHexString()}/cards`,
        payload: { template: 'invalid template' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if missing template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/questionnaires/${questionnaireId.toHexString()}/cards`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 404 if questionnaire does not exist', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'POST',
        url: `/questionnaires/${invalidId}/cards`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if questionnaire is published', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/questionnaires/${questionnairesList[1]._id.toHexString()}/cards`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          payload: { template: 'transition' },
          url: `/questionnaires/${questionnaireId.toHexString()}/cards`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('QUESTIONNAIRES ROUTES - DELETE /questionnaires/cards/{cardId}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const draftQuestionnaire = questionnairesList.find(activity => activity.status === 'draft');
  const publishedQuestionnaire = questionnairesList.find(activity => activity.status === 'published');

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete questionnaire card', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/questionnaires/cards/${draftQuestionnaire.cards[0].toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const cardDeleted = await Card.countDocuments({ _id: cardsList[0]._id });
      expect(cardDeleted).toBe(0);

      const questionnaire = await Questionnaire.findById(draftQuestionnaire._id).lean();
      expect(questionnaire.cards.length).toEqual(draftQuestionnaire.cards.length - 1);
      expect(questionnaire.cards.includes(draftQuestionnaire.cards[0])).toBeFalsy();
    });

    it('should return 404 if card not found', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/questionnaires/cards/${(new ObjectID()).toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if activity is published', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/questionnaires/cards/${publishedQuestionnaire.cards[0].toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/questionnaires/cards/${draftQuestionnaire.cards[0].toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
