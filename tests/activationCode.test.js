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
        firstSMS: expect.any(Date),
        mobile_phone: payload.mobile_phone,
        sector: payload.sector,
        managerId: userList[0]._id
      }));
    });

    const missingParams = [{
      name: 'mobile_phone',
      payload: {
        sector: '1w*',
        managerId: userList[0]._id
      }
    }, {
      name: 'sector',
      payload: {
        mobile_phone: '0645237890',
        managerId: userList[0]._id
      }
    }, {
      name: 'managerId',
      payload: {
        mobile_phone: '0645237890',
        sector: '1w*'
      }
    }];
    missingParams.forEach((param) => {
      it(`should return a 400 error if '${param.name}' parameter is missing `, async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/activation',
          payload: param.payload,
          headers: {
            'x-access-token': token
          }
        });
        expect(res.statusCode).toBe(400);
      });
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
});
