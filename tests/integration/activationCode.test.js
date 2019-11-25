const expect = require('expect');
const pick = require('lodash/pick');
const app = require('../../server');
const { populateDB, activationCode, activationCodeUser } = require('./seed/activationCodeSeed');
const ActivationCode = require('../../src/models/ActivationCode');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ACTIVATION CODE ROUTES', () => {
  let token = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    token = await getToken('coach');
  });

  describe('POST /activation', () => {
    it('should create an activation code', async () => {
      const payload = { user: activationCodeUser._id };
      const res = await app.inject({
        method: 'POST',
        url: '/activation',
        payload,
        headers: { 'x-access-token': token },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.activationCode).toEqual(expect.objectContaining({
        _id: expect.any(Object),
        firstSMS: expect.any(Date),
        user: payload.user,
      }));
      const codeData = await ActivationCode.findById(res.result.data.activationCode._id);
      expect(codeData).toEqual(expect.objectContaining({
        firstSMS: expect.any(Date),
        user: payload.user,
      }));
    });

    it("should return a 400 error if 'user' is missing", async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/activation',
        payload: {},
        headers: { 'x-access-token': token },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /activation/{code}', () => {
    it('should check activation code provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/activation/${activationCode.code}`,
        headers: { 'x-access-token': token },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data).toEqual(expect.objectContaining({
        activationCode: expect.objectContaining({
          token: expect.any(String),
          _id: activationCode._id,
          firstSMS: expect.any(Date),
          user: pick(activationCodeUser, ['_id', 'local.email', 'isConfirmed']),
          code: activationCode.code,
        }),
      }));
    });

    it('should return a 400 error if activation code is invalid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/activation/987',
        headers: { 'x-access-token': token },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return a 404 error if activation code does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/activation/0987',
        headers: { 'x-access-token': token },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
