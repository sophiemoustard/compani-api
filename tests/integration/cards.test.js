const expect = require('expect');
const app = require('../../server');
const Card = require('../../src/models/Card');
const { populateDB, cardsList } = require('./seed/cardsSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ACTIVITY ROUTES - PUT /cards/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const cardId = cardsList[0]._id;
  const payload = { title: 'rigoler' };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it("should update card's title", async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${cardId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const cardUpdated = await Card.findById(cardId);

      expect(response.statusCode).toBe(200);
      expect(cardUpdated).toEqual(expect.objectContaining({ _id: cardId, title: 'rigoler' }));
    });

    it("should return a 400 if title is equal to '' ", async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${cardId.toHexString()}`,
        payload: { name: '' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
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
          method: 'PUT',
          payload,
          url: `/cards/${cardId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
