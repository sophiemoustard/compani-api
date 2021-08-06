const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const Activity = require('../../src/models/Activity');
const Card = require('../../src/models/Card');
const { populateDB, activitiesList, cardsList } = require('./seed/activitiesSeed');
const { getToken, getTokenByCredentials } = require('./seed/authenticationSeed');
const { noRoleNoCompany } = require('../seed/userSeed');
const { TITLE_TEXT_MEDIA } = require('../../src/helpers/constants');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ACTIVITY ROUTES - GET /activity/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const activityId = activitiesList[0]._id;

  describe('Logged user', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);
    });

    it('should get activity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/activities/${activityId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

describe('ACTIVITY ROUTES - PUT /activity/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const activityId = activitiesList[0]._id;

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should update activity\'s name', async () => {
      const payload = { name: 'rigoler' };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update activity\'s name if activity is published', async () => {
      const payload = { name: 'rigoler' };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activitiesList[3]._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update cards', async () => {
      const payload = {
        cards: [
          activitiesList[0].cards[1],
          activitiesList[0].cards[0],
          activitiesList[0].cards[2],
          activitiesList[0].cards[3],
        ],
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const activityUpdated = await Activity.findById(activityId).lean();

      expect(response.statusCode).toBe(200);
      expect(activityUpdated).toEqual(expect.objectContaining({ _id: activityId, cards: payload.cards }));
    });

    it('should return a 400 if name is equal to \'\' ', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload: { name: '' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if lengths are not equal', async () => {
      const payload = { cards: [activitiesList[0].cards[1]] };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if actvities from payload and from db are not the same', async () => {
      const payload = { cards: [activitiesList[0].cards[1], new ObjectID()] };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 if activity is published', async () => {
      const payload = { type: 'quiz' };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activitiesList[3]._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
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
        const payload = { name: 'rigoler' };
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          payload,
          url: `/activities/${activityId.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ACTIVITIES ROUTES - POST /activities/{_id}/card', () => {
  let authToken = null;
  const activityId = activitiesList[0]._id;
  beforeEach(populateDB);
  const payload = { template: TITLE_TEXT_MEDIA };

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create card', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/activities/${activityId.toHexString()}/cards`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const activityUpdated = await Activity.findById(activityId).lean();

      expect(response.statusCode).toBe(200);
      expect(activityUpdated.cards.length).toEqual(5);
    });

    it('should return a 400 if invalid template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/activities/${activityId.toHexString()}/cards`,
        payload: { template: 'invalid template' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 404 if activity does not exist', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'POST',
        url: `/activities/${invalidId}/cards`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if activity is published', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/activities/${activitiesList[3]._id.toHexString()}/cards`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
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
          payload: { template: 'transition' },
          url: `/activities/${activityId.toHexString()}/cards`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ACTIVITIES ROUTES - DELETE /activities/cards/{cardId}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const draftActivity = activitiesList.find(activity => activity.status === 'draft');
  const publishedActivity = activitiesList.find(activity => activity.status === 'published');

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should delete activity card', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/activities/cards/${draftActivity.cards[0].toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const remainingCard = await Card.countDocuments({ _id: cardsList[0]._id });
      expect(remainingCard).toBe(0);

      const activity = await Activity.findById(draftActivity._id).lean();
      expect(activity.cards.length).toEqual(draftActivity.cards.length - 1);
      expect(activity.cards.includes(draftActivity.cards[0])).toBeFalsy();
    });

    it('should return 404 if card not found', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/activities/cards/${(new ObjectID()).toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if activity is published', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/activities/cards/${publishedActivity.cards[0].toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/activities/cards/${draftActivity.cards[0].toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
