const expect = require('expect');
// const { ObjectID } = require('mongodb');

const app = require('../server');
const {
  populateUsers,
  getToken,
  userList
} = require('./seed/usersSeed');
const { populateActivationCode, activationCode } = require('./seed/activationCodeSeed');
const { populateRoles } = require('./seed/rolesSeed');
const ActivationCode = require('../models/ActivationCode');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ACTIVATION CODE ROUTES', () => {
  let token = null;
  before(populateActivationCode);
  before(populateRoles);
  before(populateUsers);
  beforeEach(async () => {
    token = await getToken();
  });
  describe('POST /activation', () => {
    it('should create an activation code', async () => {
      const payload = {
        mobile_phone: '0645237890',
        sector: '1w*',
        managerId: userList[0]._id
      };
      const res = await app.inject({
        method: 'POST',
        url: '/activation',
        payload,
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.activationData).toEqual(expect.objectContaining({
        _id: expect.any(Object),
        firstSMS: expect.any(Date),
        mobile_phone: payload.mobile_phone,
        sector: payload.sector,
        managerId: userList[0]._id
      }));
      const codeData = await ActivationCode.findById(res.result.data.activationData._id);
      expect(codeData).toEqual(expect.objectContaining({
        firstSMS: expect.any(Date),
        mobile_phone: payload.mobile_phone,
        sector: payload.sector,
        managerId: userList[0]._id
      }));
    });

    it("should return a 400 error if 'mobile_phone' parameter is missing", async () => {
      const payload = {
        sector: '1w*',
        managerId: userList[0]._id
      };
      const res = await app.inject({
        method: 'POST',
        url: '/activation',
        payload,
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 400 error if mobile_phone is invalid (not local fr)', async () => {
      const payload = {
        mobile_phone: '1645237890',
        sector: '1w*',
        managerId: userList[0]._id
      };
      const res = await app.inject({
        method: 'POST',
        url: '/activation',
        payload,
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 400 error if managerId is invalid', async () => {
      const payload = {
        mobile_phone: '1645237890',
        sector: '1w*',
        managerId: '123456'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/activation',
        payload,
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /activation/{code}', () => {
    it('should check activation code provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/activation/${activationCode.code}`,
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data).toEqual(expect.objectContaining({
        token: expect.any(String),
        activationData: expect.objectContaining({
          _id: activationCode._id,
          firstSMS: expect.any(Date),
          mobile_phone: activationCode.mobile_phone,
          sector: activationCode.sector,
          managerId: activationCode.managerId
        })
      }));
    });

    it('should return a 400 error if activation code is invalid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/activation/987',
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 404 error if activation code does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/activation/0987',
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /{mobile_phone}', () => {
    it('should delete an activation code', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/activation/${activationCode.mobile_phone}`,
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(200);
      const codeData = await ActivationCode.findById(activationCode._id);
      expect(codeData).toBeNull();
    });

    it('should return a 400 error if mobile_phone is invalid', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/activation/00237865',
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 404 error if mobile_phone does not exist', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/activation/0987382938',
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
