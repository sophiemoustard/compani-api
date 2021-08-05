const { ObjectID } = require('mongodb');
const { fn: momentProto } = require('moment');
const expect = require('expect');
const GetStream = require('get-stream');
const sinon = require('sinon');
const omit = require('lodash/omit');
const get = require('lodash/get');
const pick = require('lodash/pick');
const app = require('../../server');
const User = require('../../src/models/User');
const Role = require('../../src/models/Role');
const UserCompany = require('../../src/models/UserCompany');
const Helper = require('../../src/models/Helper');
const SectorHistory = require('../../src/models/SectorHistory');
const {
  HELPER,
  COACH,
  AUXILIARY,
  TRAINER,
  AUXILIARY_WITHOUT_COMPANY,
  MOBILE,
  WEBAPP,
} = require('../../src/helpers/constants');
const {
  usersSeedList,
  populateDB,
  customerFromOtherCompany,
  helperFromOtherCompany,
  userSectors,
  sectorHistories,
  establishmentList,
  coachFromOtherCompany,
  auxiliaryFromOtherCompany,
  authCustomer,
} = require('./seed/usersSeed');
const {
  getToken,
  getTokenByCredentials,
  otherCompany,
  authCompany,
  rolesList,
} = require('./seed/authenticationSeed');
const { trainer, userList, noRoleNoCompany, auxiliary } = require('../seed/userSeed');
const GDriveStorageHelper = require('../../src/helpers/gDriveStorage');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');
const UtilsHelper = require('../../src/helpers/utils');
const { generateFormData } = require('./utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('POST /users', () => {
  let authToken;
  describe('NOT_CONNECTED', () => {
    beforeEach(populateDB);

    it('should create user if user not connected without phone is payload', async () => {
      const payload = {
        identity: { firstname: 'Test', lastname: 'Kirk' },
        local: { email: 'newuser@alenvi.io', password: 'testpassword' },
        origin: MOBILE,
      };

      const res = await app.inject({ method: 'POST', url: '/users', payload });

      expect(res.statusCode).toBe(200);

      const { user } = res.result.data;
      expect(user._id).toEqual(expect.any(Object));
      expect(user.identity.firstname).toBe('Test');
      expect(user.identity.lastname).toBe('Kirk');
      expect(user.local.email).toBe('newuser@alenvi.io');
      expect(res.result.data.user.refreshToken).not.toBeDefined();
      expect(res.result.data.user.local.password).not.toBeDefined();
    });

    it('should not create user if password too short', async () => {
      const payload = {
        identity: { firstname: 'Test', lastname: 'Kirk' },
        local: { email: 'newuser@alenvi.io', password: 'test' },
        contact: { phone: '0606060606' },
        origin: MOBILE,
      };

      const res = await app.inject({ method: 'POST', url: '/users', payload });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a user', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        role: rolesList.find(role => role.name === AUXILIARY)._id,
        sector: userSectors[0]._id,
        origin: WEBAPP,
      };
      const res = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.user._id).toEqual(expect.any(Object));
      expect(res.result.data.user.sector).toEqual(userSectors[0]._id);
      expect(res.result.data.user.role.client).toMatchObject({ name: AUXILIARY });
      expect(res.result.data.user.identity.firstname).toBe(payload.identity.firstname);
      expect(res.result.data.user.identity.lastname).toBe(payload.identity.lastname);
      expect(res.result.data.user.local.email).toBe(payload.local.email);
      expect(res.result.data.user.serialNumber).toEqual(expect.any(String));

      const userId = res.result.data.user._id;
      const userSectorHistory = await SectorHistory.countDocuments({
        auxiliary: userId,
        sector: userSectors[0]._id,
        startDate: { $exists: false },
      });
      expect(userSectorHistory).toEqual(1);

      const userCompanyCount = await UserCompany.countDocuments({ user: userId, company: authCompany._id });
      expect(userCompanyCount).toEqual(1);
    });

    it('should not create user if password in payload', async () => {
      const payload = {
        identity: { firstname: 'Test', lastname: 'Kirk' },
        local: { email: 'newuser@alenvi.io', password: 'testpassword' },
        contact: { phone: '0606060606' },
        origin: MOBILE,
      };
      const res = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not create a user if role provided does not exist', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        sector: userSectors[0]._id,
        origin: WEBAPP,
        role: new ObjectID(),
      };
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should not create a user if not from his company', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        sector: userSectors[0]._id,
        origin: WEBAPP,
        contact: { phone: '0712345678' },
        company: otherCompany._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not create a user if email provided already exists', async () => {
      const payload = {
        identity: { firstname: 'user', lastname: 'Kirk' },
        origin: WEBAPP,
        local: { email: usersSeedList[0].local.email },
        contact: { phone: '0712345678' },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should not create a user if phone number is not correct', async () => {
      const payload = {
        identity: { firstname: 'Bonjour', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        origin: WEBAPP,
        contact: { phone: '023' },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 if customer is not from the same company', async () => {
      const payload = {
        identity: { firstname: 'coucou', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        origin: WEBAPP,
        customer: customerFromOtherCompany._id,
        contact: { phone: '0712345678' },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    const missingParams = ['local.email', 'identity.lastname', 'origin'];
    missingParams.forEach((param) => {
      it(`should return a 400 error if '${param}' payload is missing`, async () => {
        const payload = {
          identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
          local: { email: 'kirk@alenvi.io' },
          origin: WEBAPP,
          contact: { phone: '0712345678' },
        };
        const res = await app.inject({
          method: 'POST',
          url: '/users',
          payload: omit(payload, param),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });
    });

    it('should return a 403 if created user has no role and payload has no phone', async () => {
      const payload = {
        identity: { firstname: 'Chloé', lastname: '6,022 140 76 × 10^(23) atomes' },
        local: { email: 'chlochlo@alenvi.io' },
        origin: WEBAPP,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create a user for another company', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        role: rolesList.find(role => role.name === COACH)._id,
        sector: userSectors[0]._id,
        origin: WEBAPP,
        company: otherCompany._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.user.company).toBeDefined();
      expect(response.result.data.user.company._id).toEqual(otherCompany._id);
    });

    it('should create a trainer', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        role: rolesList.find(role => role.name === TRAINER)._id,
        origin: WEBAPP,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'vendor_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];
    beforeEach(populateDB);

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const payload = {
          identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
          local: { email: 'kirk@alenvi.io' },
          origin: MOBILE,
          contact: { phone: '0712345678' },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/users',
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /users', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should get all users (company B)', async () => {
      authToken = await getTokenByCredentials(coachFromOtherCompany.local);

      const res = await app.inject({
        method: 'GET',
        url: `/users?company=${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const usersCount = await UserCompany.countDocuments({ company: otherCompany._id });
      expect(res.result.data.users.length).toBe(usersCount);
    });

    it('should get all coachs users (company A)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users?company=${authCompany._id}&role=coach`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.length).toBe(2);
      expect(res.result.data.users.every(u => get(u, 'role.client.name') === COACH)).toBeTruthy();
    });

    it('should not get users if role given doesn\'t exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users?company=${authCompany._id}&role=Babouin`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return a 403 if company is not the same and does not have a vendor role', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users?company=${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if missing company params', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users?company=${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('VENDOR_ADMIN', () => {
    it('should get all users from all companies', async () => {
      authToken = await getToken('vendor_admin');
      const res = await app.inject({
        method: 'GET',
        url: '/users',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const usersCount = await User.countDocuments();
      expect(res.result.data.users.length).toBe(usersCount);
    });

    it('should get users from an other companies', async () => {
      authToken = await getToken('vendor_admin');
      const res = await app.inject({
        method: 'GET',
        url: `/users?company=${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/users?company=${authCompany._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /users/exists', () => {
  let authToken;
  beforeEach(populateDB);
  describe('NOT LOGGED', () => {
    it('should return 200 if user not connected', async () => {
      const { email } = usersSeedList[0].local;
      const res = await app.inject({
        method: 'GET',
        url: `/users/exists?email=${email}`,
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should return true and user if user exists', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/exists?email=${usersSeedList[0].local.email}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.exists).toBe(true);
      expect(res.result.data.user).toEqual({ ...pick(usersSeedList[0], ['role', '_id']), company: authCompany._id });
    });

    it('should return false if user does not exists', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users/exists?email=test@test.fr',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.exists).toBe(false);
      expect(res.result.data.user).toEqual({});
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
      { name: 'trainer', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/users/exists?email=${usersSeedList[0].local.email}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);

        if (response.result.data) {
          expect(response.result.data.exists).toBe(true);
          expect(response.result.data.user).toEqual({
            ...pick(usersSeedList[0], ['role', '_id']),
            company: authCompany._id,
          });
        }
      });
    });
  });
});

describe('GET /users/sector-histories', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);

    it('should get all auxiliary users', async () => {
      authToken = await getTokenByCredentials(usersSeedList[0].local);

      const res = await app.inject({
        method: 'GET',
        url: `/users/sector-histories?company=${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.length).toBe(7);
      expect(res.result.data.users).toEqual(expect.arrayContaining([
        expect.objectContaining({
          role: expect.objectContaining({
            client: expect.objectContaining({
              name: expect.stringMatching(/auxiliary|planning_referent|auxiliary_without_company/),
            }),
          }),
          sectorHistories: expect.any(Array),
        }),
      ]));
    });

    it('should return a 403 if try to get other company', async () => {
      authToken = await getTokenByCredentials(usersSeedList[0].local);

      const res = await app.inject({
        method: 'GET',
        url: `/users/sector-histories?company=${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/users/sector-histories?company=${authCompany._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /users/learners', () => {
  let authToken;
  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should return all learners', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users/learners',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);

      const userCount = await User.countDocuments();
      expect(res.result.data.users.length).toEqual(userCount);
      expect(res.result.data.users).toEqual(expect.arrayContaining([
        expect.objectContaining({
          identity: expect.objectContaining({ firstname: expect.any(String), lastname: expect.any(String) }),
          company: expect.objectContaining({ _id: expect.any(ObjectID), name: expect.any(String) }),
          picture: expect.objectContaining({ publicId: expect.any(String), link: expect.any(String) }),
          blendedCoursesCount: expect.any(Number),
        }),
        expect.objectContaining({ _id: coachFromOtherCompany._id, blendedCoursesCount: 0 }),
        expect.objectContaining({ _id: helperFromOtherCompany._id, blendedCoursesCount: 1 }),
        expect.objectContaining({ _id: usersSeedList[0]._id, blendedCoursesCount: 2 }),
      ]));
    });

    it('should return 200 if a vendor asks all learners with company', async () => {
      authToken = await getToken('vendor_admin');
      const res = await app.inject({
        method: 'GET',
        url: `/users/learners?hasCompany=${true}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should return 400 if queries hasCompany and company are used together', async () => {
      authToken = await getToken('vendor_admin');
      const res = await app.inject({
        method: 'GET',
        url: `/users/learners?hasCompany=${true}&&company=${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    it('should return 200 if coach requests learners from his company', async () => {
      authToken = await getToken('coach');
      const res = await app.inject({
        method: 'GET',
        url: `/users/learners?company=${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.every(u => UtilsHelper.areObjectIdsEquals(u.company._id, authCompany._id)))
        .toBeTruthy();
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, details: 'if not his company' },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'trainer', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name} ${get(role, 'details') || ''}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/users/learners',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is client_admin and does not request user from his company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/users/learners?company=${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('GET /users/active', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should get all active users (company A)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/active?company=${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.length).toBe(5);
      expect(res.result.data.users).toEqual(expect.arrayContaining([expect.objectContaining({ isActive: true })]));
    });

    it('should get all active users from other company if role vendor', async () => {
      authToken = await getToken('vendor_admin');
      const res = await app.inject({
        method: 'GET',
        url: `/users/active?company=${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.length).toBe(1);
      expect(res.result.data.users).toEqual(expect.arrayContaining([
        expect.objectContaining({ isActive: true }),
      ]));
    });

    it('should get all active auxiliary users (company B)', async () => {
      authToken = await getTokenByCredentials(coachFromOtherCompany.local);

      const res = await app.inject({
        method: 'GET',
        url: `/users/active?company=${otherCompany._id}&role=auxiliary`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.length).toBe(1);
    });

    it('should return a 403 if not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/active?email=${helperFromOtherCompany.local.email}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/users/active?company=${authCompany._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /users/:id', () => {
  let authToken;
  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should return user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/${usersSeedList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.user).toBeDefined();
      expect(res.result.data.user).toEqual(expect.objectContaining({
        identity: expect.objectContaining({
          firstname: usersSeedList[0].identity.firstname,
          lastname: usersSeedList[0].identity.lastname,
        }),
        local: expect.objectContaining({ email: usersSeedList[0].local.email }),
        role: expect.objectContaining({ client: expect.objectContaining({ name: 'auxiliary' }) }),
        isActive: expect.any(Boolean),
        sector: userSectors[0]._id,
        contracts: expect.arrayContaining([
          expect.objectContaining({
            _id: expect.any(ObjectID),
            company: expect.any(ObjectID),
            startDate: expect.any(Object),
            user: expect.any(Object),
            versions: expect.any(Array),
          }),
        ]),
      }));
    });

    it('should return a 404 error if no user found', async () => {
      const id = new ObjectID();
      const res = await app.inject({
        method: 'GET',
        url: `/users/${id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return a 403 error if user is not from same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/${auxiliaryFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return trainer', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/${trainer._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Other roles', () => {
    it('should return user if it is me - no role no company', async () => {
      authToken = await getTokenByCredentials(userList[11].local);

      const response = await app.inject({
        method: 'GET',
        url: `/users/${userList[11]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if it is not me - no role no company', async () => {
      authToken = await getTokenByCredentials(userList[11].local);

      const response = await app.inject({
        method: 'GET',
        url: `/users/${usersSeedList[8]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    const roles = [{ name: 'helper', expectedCode: 403 }, { name: 'planning_referent', expectedCode: 403 }];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: `/users/${usersSeedList[1]._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PUT /users/:id', () => {
  let authToken;
  const updatePayload = { identity: { firstname: 'Riri' }, local: { email: 'riri@alenvi.io' } };

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should update the user', async () => {
      const userId = usersSeedList[0]._id.toHexString();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: updatePayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);

      const userCount = await User
        .countDocuments({ _id: userId, 'identity.firstname': 'Riri', 'local.email': 'riri@alenvi.io' });
      expect(userCount).toEqual(1);
    });

    it('should update the user sector and sector history', async () => {
      const userId = usersSeedList[0]._id.toHexString();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: { sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);

      const updatedUser = await User.findById(userId)
        .populate({ path: 'sector', select: '_id sector', match: { company: authCompany._id } })
        .lean({ autopopulate: true, virtuals: true });
      expect(updatedUser).toBeDefined();
      expect(updatedUser.sector).toEqual(userSectors[1]._id);

      const userSectorHistory = sectorHistories.filter(history => history.auxiliary.toHexString() === userId);
      const sectorHistoryCount = await SectorHistory.countDocuments({ auxiliary: userId, company: authCompany });
      expect(sectorHistoryCount).toBe(userSectorHistory.length + 1);
    });

    it('should delete unrelevant sector histories on update', async () => {
      const userId = usersSeedList[0]._id.toHexString();
      const firstResponse = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: { sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(firstResponse.statusCode).toBe(200);

      const secondRespons = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: { sector: userSectors[2]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(secondRespons.statusCode).toBe(200);

      const updatedUser = await User.findById(userId)
        .populate({ path: 'sector', select: '_id sector', match: { company: authCompany._id } })
        .lean();

      expect(updatedUser.sector).toEqual(userSectors[2]._id);
      const histories = await SectorHistory.find({ auxiliary: userId, company: authCompany }).lean();
      expect(histories.find(sh => sh.sector.toHexString() === userSectors[0]._id.toHexString())).toBeDefined();
      expect(histories.find(sh => sh.sector.toHexString() === userSectors[1]._id.toHexString())).toBeUndefined();
      expect(histories.find(sh => sh.sector.toHexString() === userSectors[2]._id.toHexString())).toBeDefined();
    });

    it('should not create sectorhistory if it is same sector', async () => {
      const userId = usersSeedList[0]._id.toHexString();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: { sector: userSectors[0]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const histories = await SectorHistory.find({ auxiliary: userId, company: authCompany }).lean();
      expect(histories.length).toEqual(1);
      expect(histories[0].sector).toEqual(userSectors[0]._id);
    });

    it('should update sectorHistory if auxiliary does not have contract', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[1]._id}`,
        payload: { sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const histories = await SectorHistory.find({ auxiliary: usersSeedList[1]._id, company: authCompany }).lean();
      expect(histories.length).toEqual(1);
      expect(histories[0].sector).toEqual(userSectors[1]._id);
    });

    it('should update sectorHistory if auxiliary contract is between contracts', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[4]._id}`,
        payload: { sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const histories = await SectorHistory.find({ auxiliary: usersSeedList[4]._id, company: authCompany }).lean();
      expect(histories.length).toEqual(1);
      expect(histories[0].sector).toEqual(userSectors[1]._id);
    });

    it('should create sectorHistory if auxiliary does not have one', async () => {
      const role = await Role.find({ name: 'auxiliary' }).lean();
      const previousHistories = await SectorHistory.find({ auxiliary: usersSeedList[7]._id, company: authCompany })
        .lean();

      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[7]._id}`,
        payload: { role: role._id, sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(previousHistories).toHaveLength(0);
      const histories = await SectorHistory.find({ auxiliary: usersSeedList[7]._id, company: authCompany }).lean();
      expect(histories.length).toEqual(1);
      expect(histories[0].sector).toEqual(userSectors[1]._id);
      expect(histories[0].startDate).toBeUndefined();
    });

    it('should add helper role to user', async () => {
      const role = await Role.findOne({ name: HELPER }).lean();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${userList[6]._id}`,
        payload: { customer: authCustomer._id, role: role._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should add helper role to user if no company', async () => {
      const role = await Role.findOne({ name: HELPER }).lean();
      expect(await UserCompany.countDocuments({ user: userList[8]._id })).toBe(0);

      const res = await app.inject({
        method: 'PUT',
        url: `/users/${userList[8]._id}`,
        payload: { customer: authCustomer._id, role: role._id, company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(await UserCompany.countDocuments({ user: userList[8]._id })).toBe(1);
    });

    it('should not add helper role to user if customer is not from the same company as user', async () => {
      const role = await Role.findOne({ name: HELPER }).lean();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${userList[6]._id}`,
        payload: { customer: customerFromOtherCompany._id, role: role._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not add helper role to user if already has a client role', async () => {
      const role = await Role.findOne({ name: HELPER }).lean();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id}`,
        payload: { customer: customerFromOtherCompany._id, role: role._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should update a user with vendor role', async () => {
      const roleTrainer = await Role.findOne({ name: TRAINER }).lean();
      const userId = usersSeedList[0]._id;
      const trainerPayload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: usersSeedList[0].local.email },
        role: roleTrainer._id,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: trainerPayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const userCount = await User
        .countDocuments({ _id: userId, 'identity.lastname': 'Kirk', 'role.vendor': roleTrainer._id });
      expect(userCount).toEqual(1);
    });

    it('should update a user who has no role, with auxiliary role', async () => {
      const roleAuxiliary = await Role.findOne({ name: AUXILIARY }).lean();
      const userId = usersSeedList[6]._id;
      const auxiliaryPayload = {
        identity: { title: 'mr', lastname: 'Auxiliary', firstname: 'test' },
        contact: { phone: '0600000001' },
        local: { email: usersSeedList[6].local.email },
        role: roleAuxiliary._id,
        sector: userSectors[0]._id,
        administrative: { transportInvoice: { transportType: 'public' } },
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: auxiliaryPayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const userCount = await User
        .countDocuments({ _id: userId, 'identity.lastname': 'Auxiliary', 'role.client': roleAuxiliary._id });
      expect(userCount).toEqual(1);
    });

    it('should return a 409 if the role switch is not allowed', async () => {
      const roleAuxiliary = await Role.findOne({ name: AUXILIARY }).lean();
      const userId = usersSeedList[2]._id;
      const auxiliaryPayload = {
        identity: { title: 'mr', lastname: 'Kitty', firstname: 'Admin3' },
        contact: { phone: '0600000001' },
        local: { email: usersSeedList[2].local.email },
        role: roleAuxiliary._id,
        sector: userSectors[0]._id,
        administrative: { transportInvoice: { transportType: 'public' } },
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: auxiliaryPayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
      expect(response.result.message).toBe('Ce compte a déjà un rôle sur cette interface.');
    });

    it('should return a 404 error if no user found', async () => {
      const id = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${id}`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return a 403 error if user is not from the same company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${helperFromOtherCompany._id}`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('should return a 400 error if user establishment is removed', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id}`,
        payload: { establishment: null },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 403 error if user establishment is not from same company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id}`,
        payload: { establishment: establishmentList[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('should not update a user if phone number is not correct', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { contact: { phone: '09876' } },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should not update a user if trying to update password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { local: { password: '123456!eR' } },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });
    it('should update trainer', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${trainer._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { firstname: 'trainerUpdate' }, biography: 'It\'s my life' },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should return 200 if company is in payload and is the same as the user company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id.toHexString()}`,
        payload: { company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return a 403 error if trying to set user company to an other company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${helperFromOtherCompany._id}`,
        payload: { company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    it('should update user if it is me - no role no company', async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userList[11]._id.toHexString()}`,
        payload: updatePayload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should not update another field than allowed ones if aux-without-company', async () => {
      authToken = await getToken('auxiliary_without_company');
      const roleAuxiliary = await Role.findOne({ name: AUXILIARY_WITHOUT_COMPANY }).lean();
      const userId = userList[3]._id;
      const auxiliaryPayload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        contact: { phone: '0600000001' },
        local: { email: userList[3].local.email },
        role: roleAuxiliary._id,
        picture: { link: 'test' },
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: auxiliaryPayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not update another field than allowed ones if no role', async () => {
      const user = userList[10];
      authToken = await getTokenByCredentials(user.local);
      const userId = user._id;
      const payload = {
        identity: { firstname: 'No', lastname: 'Body' },
        contact: { phone: '0344543932' },
        local: { email: user.local.email },
        picture: { link: 'test' },
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'PUT',
          url: `/users/${userList[1]._id.toHexString()}`,
          payload: updatePayload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('DELETE /users/:id', () => {
  let authToken;
  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    usersSeedList.forEach(async (user) => {
      let message;
      let statusCode;
      const helperRoleId = rolesList.find(role => role.name === 'helper')._id;
      let userCompanyExistBefore;
      let helperExistBefore;
      if (get(user, 'role.client') === helperRoleId) {
        message = 'should delete a helper by id';
        statusCode = 200;

        userCompanyExistBefore = !!await UserCompany.countDocuments({ user: user._id });
        helperExistBefore = !!await Helper.countDocuments({ user: user._id });
      } else {
        message = 'should return 403 as user is not helper';
        statusCode = 403;
      }

      it(message, async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: `/users/${user._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(statusCode);

        if (get(user, 'role.client') === helperRoleId) {
          const userCompanyExistAfter = !!await UserCompany.countDocuments({ user: user._id });
          const helperExistAfter = !!await Helper.countDocuments({ user: user._id });

          expect(userCompanyExistBefore).toBeTruthy();
          expect(helperExistBefore).toBeTruthy();
          expect(userCompanyExistAfter).toBeFalsy();
          expect(helperExistAfter).toBeFalsy();
        }
      });
    });

    it('should return a 404 error if user is not found', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/users/${(new ObjectID()).toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return a 403 error if user is not from same company', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/users/${helperFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/users/${usersSeedList[3]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PUT /users/:id/certificates', () => {
  let authToken;
  const updatePayload = { certificates: { driveId: usersSeedList[0].administrative.certificates.driveId } };
  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should update user certificates', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id.toHexString()}/certificates`,
        payload: updatePayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should return a 404 error if no user found', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${new ObjectID().toHexString()}/certificates`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return a 403 error if user is not from same company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${auxiliaryFromOtherCompany._id.toHexString()}/certificates`,
        payload: updatePayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    it('should update user certificate if it is me', async () => {
      authToken = await getToken('auxiliary');

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${auxiliary._id.toHexString()}/certificates`,
        payload: updatePayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    const roles = [{ name: 'helper', expectedCode: 403 }, { name: 'planning_referent', expectedCode: 403 }];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'PUT',
          url: `/users/${usersSeedList[1]._id.toHexString()}/certificates`,
          payload: updatePayload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('POST /users/:id/gdrive/:drive_id/upload', () => {
  let authToken;
  let docPayload;
  let form;
  let addFileStub;
  beforeEach(() => {
    docPayload = { fileName: 'mutual_fund_doc', type: 'mutualFund', file: 'true' };
    form = generateFormData(docPayload);
    addFileStub = sinon.stub(GDriveStorageHelper, 'addFile')
      .returns({ id: 'qwerty', webViewLink: 'http://test.com/file.pdf' });
  });
  afterEach(() => {
    addFileStub.restore();
  });

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should add an administrative document for a user', async () => {
      const userFolderId = usersSeedList[0].administrative.driveFolder.driveId;
      const response = await app.inject({
        method: 'POST',
        url: `/users/${usersSeedList[0]._id}/gdrive/${userFolderId}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.uploadedFile).toMatchObject({ id: 'qwerty' });
      const userCount = await User.countDocuments({
        _id: usersSeedList[0]._id,
        'administrative.mutualFund': { driveId: 'qwerty', link: 'http://test.com/file.pdf' },
      });
      expect(userCount).toEqual(1);
      sinon.assert.calledOnce(addFileStub);
    });

    it('should return a 403 error if user is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${auxiliaryFromOtherCompany._id}/gdrive/${new ObjectID()}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    const wrongParams = ['type', 'file', 'fileName'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const userFolderId = usersSeedList[0].administrative.driveFolder.driveId;
        form = generateFormData(omit(docPayload, param));
        const response = await app.inject({
          method: 'POST',
          url: `/users/${usersSeedList[0]._id}/gdrive/${userFolderId}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    it('should add administrative document if it is me', async () => {
      authToken = await getToken('auxiliary');

      const auxiliaryFolderId = auxiliary.administrative.driveFolder.driveId;
      const response = await app.inject({
        method: 'POST',
        url: `/users/${auxiliary._id}/gdrive/${auxiliaryFolderId}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    const roles = [{ name: 'helper', expectedCode: 403 }, { name: 'planning_referent', expectedCode: 403 }];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'POST',
          url: `/users/${usersSeedList[1]._id}/gdrive/${usersSeedList[1].administrative.driveFolder}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('POST /users/:id/upload', () => {
  let authToken;
  let uploadUserMediaStub;
  let momentFormat;
  beforeEach(() => {
    uploadUserMediaStub = sinon.stub(GCloudStorageHelper, 'uploadUserMedia');
    momentFormat = sinon.stub(momentProto, 'format');
  });
  afterEach(() => {
    uploadUserMediaStub.restore();
    momentFormat.restore();
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should add a user picture', async () => {
      const user = usersSeedList[0];
      const form = generateFormData({ fileName: 'user_image_test', file: 'yoyoyo' });
      uploadUserMediaStub.returns({ public_id: 'abcdefgh', secure_url: 'https://alenvi.io' });
      momentFormat.returns('20200625054512');

      const payload = await GetStream(form);
      const response = await app.inject({
        method: 'POST',
        url: `/users/${user._id}/upload`,
        payload,
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledOnceWithExactly(uploadUserMediaStub, { fileName: 'user_image_test', file: 'yoyoyo' });
    });

    const wrongParams = ['file', 'fileName'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const user = usersSeedList[0];
        const invalidForm = generateFormData(omit({ fileName: 'user_image_test', file: 'yoyoyo' }, param));
        const response = await app.inject({
          method: 'POST',
          url: `/users/${user._id}/upload`,
          payload: await GetStream(invalidForm),
          headers: { ...invalidForm.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    it('should upload picture if it is me', async () => {
      const user = userList[11];
      authToken = await getTokenByCredentials(user.local);

      const form = generateFormData({ fileName: 'user_image_test', file: 'yoyoyo' });
      uploadUserMediaStub.returns({ public_id: 'abcdefgh', secure_url: 'https://alenvi.io' });

      const response = await app.inject({
        method: 'POST',
        url: `/users/${user._id.toHexString()}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        uploadUserMediaStub.returns({ public_id: 'abcdefgh', secure_url: 'https://alenvi.io' });
        authToken = await getToken(role.name);
        const user = usersSeedList[0];
        const form = generateFormData({ fileName: 'user_image_test', file: 'yoyoyo' });

        const response = await app.inject({
          method: 'POST',
          url: `/users/${user._id}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('DELETE /users/:id/upload', () => {
  let authToken;
  let deleteUserMediaStub;
  beforeEach(() => {
    deleteUserMediaStub = sinon.stub(GCloudStorageHelper, 'deleteUserMedia');
  });
  afterEach(() => {
    deleteUserMediaStub.restore();
  });

  describe('VENDOR ROLE', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete picture', async () => {
      const user = usersSeedList[0];
      const pictureExistsBeforeUpdate = await User
        .countDocuments({ _id: user._id, 'picture.publicId': { $exists: true } });

      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${user._id}/upload`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledOnceWithExactly(deleteUserMediaStub, 'a/public/id');

      const isPictureDeleted = await User.countDocuments({ _id: user._id, 'picture.publicId': { $exists: false } });
      expect(pictureExistsBeforeUpdate).toBeTruthy();
      expect(isPictureDeleted).toBeTruthy();
    });

    it('should return 404 if invalid user id', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${invalidId.toHexString()}/upload`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);
    it('should delete picture if it is me', async () => {
      const user = userList[11];
      authToken = await getTokenByCredentials(user.local);
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${user._id}/upload`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const user = userList[0];
        const response = await app.inject({
          method: 'DELETE',
          url: `/users/${user._id}/upload`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('POST /users/:id/drivefolder', () => {
  let authToken;
  let createFolderStub;
  beforeEach(() => {
    createFolderStub = sinon.stub(GDriveStorageHelper, 'createFolder');
  });
  afterEach(() => {
    createFolderStub.restore();
  });

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should create a drive folder for a user', async () => {
      createFolderStub.returns({ id: '1234567890', webViewLink: 'http://test.com' });

      const response = await app.inject({
        method: 'POST',
        url: `/users/${usersSeedList[0]._id.toHexString()}/drivefolder`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const userCount = await User.countDocuments({
        _id: usersSeedList[0]._id,
        'administrative.driveFolder': { driveId: '1234567890', link: 'http://test.com' },
      });
      expect(userCount).toEqual(1);
      sinon.assert.calledWithExactly(createFolderStub, usersSeedList[0].identity, authCompany.auxiliariesFolderId);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);
    const roles = [{ name: 'helper', expectedCode: 403 }, { name: 'planning_referent', expectedCode: 403 }];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        createFolderStub.returns({ id: '1234567890', webViewLink: 'http://test.com' });

        const response = await app.inject({
          method: 'POST',
          url: `/users/${usersSeedList[1]._id.toHexString()}/drivefolder`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('POST /users/:id', () => {
  let authToken;

  describe('LOGGED_USER', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getTokenByCredentials(usersSeedList[0].local);
    });

    it('should add a formationExpoToken to logged user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${usersSeedList[0]._id.toHexString()}/expo-token`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { formationExpoToken: 'ExponentPushToken[jeSuisUnNouvelIdExpo]' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if formationExpoToken hasn\'t the right type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${usersSeedList[0]._id.toHexString()}/expo-token`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { formationExpoToken: 'jeMeFaitPasserPourUnIdExpo' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 if user is not loggedUser', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${usersSeedList[1]._id.toHexString()}/expo-token`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { formationExpoToken: 'ExponentPushToken[jeSuisNouvelIdExpo]' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if token already exists for user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${usersSeedList[0]._id.toHexString()}/expo-token`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { formationExpoToken: 'ExponentPushToken[jeSuisUnAutreIdExpo]' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/users/${usersSeedList[0]._id.toHexString()}/expo-token`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { formationExpoToken: 'ExponentPushToken[jeSuisUnAutreIdExpo]' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('DELETE /users/:id/expo-token/:expoToken', () => {
  let authToken;

  describe('LOGGED_USER', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getTokenByCredentials(usersSeedList[0].local);
    });

    it('should remove formationExpoToken from formationExpoTokenList', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${usersSeedList[0]._id.toHexString()}`
        + `/expo-token/${usersSeedList[0].formationExpoTokenList[0]}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if user is not loggedUser', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${usersSeedList[1]._id.toHexString()}`
        + `/expo-token/${usersSeedList[0].formationExpoTokenList[0]}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/users/${usersSeedList[0]._id.toHexString()}`
          + `/expo-token/${usersSeedList[0].formationExpoToken}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
