const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const Activity = require('../../src/models/Activity');
const {
  populateDB,
  activitiesList,
  stepsList,
  subProgramsList,
  programsList,
} = require('./seed/activitiesSeed');
const { getToken } = require('./seed/authenticationSeed');
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

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get activity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/activities/${activityId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.activity).toEqual(expect.objectContaining({
        _id: activityId,
        name: 'manger',
        cards: expect.arrayContaining([expect.objectContaining({
          _id: expect.any(ObjectID),
          title: 'ceci est un titre',
          template: 'transition',
        }),
        expect.objectContaining({
          _id: expect.any(ObjectID),
          template: 'title_text',
          title: 'ceci est un titre',
          text: 'test',
        }),
        expect.objectContaining({
          _id: expect.any(ObjectID),
          template: 'title_text_media',
          title: 'ceci est un titre',
          text: 'text',
          media: { link: 'lien', publicId: 'id' },
        }),
        expect.objectContaining({
          _id: expect.any(ObjectID),
          template: 'flashcard',
          text: 'ceci est un text',
          backText: 'ceci est un backText',
        }),
        ]),
        steps: expect.arrayContaining([{
          _id: stepsList[0]._id,
          subProgram: {
            _id: subProgramsList[0]._id,
            isStrictlyELearning: false,
            program: { _id: programsList[0]._id, name: 'au programme télévisé' },
          },
        }]),
      }));
    });
  });

  it('should return 401 if user is not authenticate', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/activities/${activityId.toHexString()}`,
    });

    expect(response.statusCode).toBe(401);
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/activities/${activityId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ACTIVITY ROUTES - PUT /activity/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const activityId = activitiesList[0]._id;

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should update activity\'s name', async () => {
      const payload = { name: 'rigoler' };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const activityUpdated = await Activity.findById(activityId);

      expect(response.statusCode).toBe(200);
      expect(activityUpdated).toEqual(expect.objectContaining({ _id: activityId, name: 'rigoler' }));
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
        headers: { 'x-access-token': authToken },
      });

      const activityUpdated = await Activity.findById(activityId).lean();

      expect(response.statusCode).toBe(200);
      expect(activityUpdated).toEqual(expect.objectContaining({ _id: activityId, cards: payload.cards }));
    });

    it('should return a 400 if payload is empty', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload: {},
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if name is equal to \'\' ', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload: { name: '' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if lengths are not equal', async () => {
      const payload = { cards: [activitiesList[0].cards[1]] };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if actvities from payload and from db are not the same', async () => {
      const payload = { cards: [activitiesList[0].cards[1], new ObjectID()] };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activityId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 if activity is published', async () => {
      const payload = { name: 'rigoler' };
      const response = await app.inject({
        method: 'PUT',
        url: `/activities/${activitiesList[3]._id.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
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
        const payload = { name: 'rigoler' };
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          payload,
          url: `/activities/${activityId.toHexString()}`,
          headers: { 'x-access-token': authToken },
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

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create card', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/activities/${activityId.toHexString()}/cards`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const activityUpdated = await Activity.findById(activityId);

      expect(response.statusCode).toBe(200);
      expect(activityUpdated._id).toEqual(activityId);
      expect(activityUpdated.cards.length).toEqual(5);
    });

    it('should return a 400 if invalid template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/activities/${activityId.toHexString()}/cards`,
        payload: { template: 'invalid template' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if missing template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/activities/${activityId.toHexString()}/cards`,
        payload: {},
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if activity does not exist', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'POST',
        url: `/activities/${invalidId}/cards`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if activity is published', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/activities/${activitiesList[3]._id.toHexString()}/cards`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
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
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          payload: { template: 'transition' },
          url: `/activities/${activityId.toHexString()}/cards`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
