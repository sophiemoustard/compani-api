const { ObjectId } = require('mongodb');
const { expect } = require('expect');
const GetStream = require('get-stream');
const sinon = require('sinon');
const omit = require('lodash/omit');
const get = require('lodash/get');
const pick = require('lodash/pick');
const app = require('../../server');
const User = require('../../src/models/User');
const ActivityHistory = require('../../src/models/ActivityHistory');
const Course = require('../../src/models/Course');
const CompanyLinkRequest = require('../../src/models/CompanyLinkRequest');
const Role = require('../../src/models/Role');
const UserCompany = require('../../src/models/UserCompany');
const Helper = require('../../src/models/Helper');
const SectorHistory = require('../../src/models/SectorHistory');
const {
  HELPER,
  COACH,
  AUXILIARY,
  TRAINER,
  MOBILE,
  WEBAPP,
  DAY,
} = require('../../src/helpers/constants');
const {
  usersSeedList,
  usersFromOtherCompanyList,
  populateDB,
  customer,
  customerFromOtherCompany,
  helperFromOtherCompany,
  userSectors,
  sectorHistories,
  establishmentList,
  auxiliaryFromOtherCompany,
  traineeWhoLeftOtherCompany,
} = require('./seed/usersSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { otherCompany, authCompany, companyWithoutSubscription } = require('../seed/authCompaniesSeed');
const { coach, trainer, userList, noRoleNoCompany, auxiliary } = require('../seed/authUsersSeed');
const { rolesList, auxiliaryRoleId, coachRoleId, trainerRoleId, helperRoleId } = require('../seed/authRolesSeed');
const GDriveStorageHelper = require('../../src/helpers/gDriveStorage');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');
const { CompaniDate } = require('../../src/helpers/dates/companiDates');
const UtilsHelper = require('../../src/helpers/utils');
const { generateFormData } = require('./utils');
const UtilsMock = require('../utilsMock');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('USERS ROUTES - POST /users', () => {
  let authToken;
  describe('NOT_CONNECTED', () => {
    beforeEach(populateDB);

    it('should create user', async () => {
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

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should create a user', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        role: auxiliaryRoleId,
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

      const userCompanyCount = await UserCompany.countDocuments({
        user: userId,
        company: authCompany._id,
        userCompanyStartDate: CompaniDate().startOf(DAY).toISO(),
      });
      expect(userCompanyCount).toEqual(1);
    });

    it('should return a 403 if password in payload', async () => {
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

    it('should return a 400 if role provided does not exist', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        sector: userSectors[0]._id,
        origin: WEBAPP,
        role: new ObjectId(),
      };
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 user if not from his company', async () => {
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

    it('should return a 400 user if payload has not company but has userCompanyStartDate', async () => {
      const payload = {
        identity: { firstname: 'Apprenant', lastname: 'Luce' },
        local: { email: 'apprenant.gary@alenvi.io' },
        sector: userSectors[0]._id,
        origin: WEBAPP,
        contact: { phone: '0727274044' },
        userCompanyStartDate: '2022-12-13T11:00:11.000Z',
      };
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 if email provided already exists', async () => {
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

    it('should return a 400 if phone number is not correct', async () => {
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

    it('should return a 404 if customer is not from the same company', async () => {
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

      expect(response.statusCode).toBe(404);
    });

    ['local.email', 'identity.lastname', 'origin'].forEach((param) => {
      it(`should return a 400 error if '${param}' is missing in payload`, async () => {
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

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create a user for another company', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        role: coachRoleId,
        sector: userSectors[0]._id,
        origin: WEBAPP,
        company: otherCompany._id,
        userCompanyStartDate: '2022-12-13T15:00:30.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const userCompanyCount = await UserCompany.countDocuments({
        user: response.result.data.user._id,
        company: otherCompany._id,
        startDate: '2022-12-12T23:00:00.000Z',
      });
      expect(userCompanyCount).toEqual(1);
    });

    it('should create a trainer', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        role: trainerRoleId,
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

  describe('TRAINER', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('trainer');
    });

    it('should create a user with company and without role', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        origin: WEBAPP,
        contact: { phone: '0712345678' },
        company: otherCompany._id,
        userCompanyStartDate: '2022-11-14T23:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const userId = response.result.data.user._id;

      const userCount = await User.countDocuments({ _id: userId });
      expect(userCount).toEqual(1);
      const updatedCompany = await UserCompany.countDocuments({ user: userId, startDate: '2022-11-14T23:00:00.000Z' });
      expect(updatedCompany).toBeTruthy();
    });

    it('should return 403 if create user without company', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        origin: WEBAPP,
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

    it('should return 403 if create user with role', async () => {
      const payload = {
        identity: { firstname: 'Auxiliary2', lastname: 'Kirk' },
        local: { email: 'kirk@alenvi.io' },
        role: trainerRoleId,
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

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
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

describe('USERS ROUTES - GET /users', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get all coachs users (company A), role as a string', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users?company=${authCompany._id}&role=coach`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.length).toBe(3);
      expect(res.result.data.users.every(u => get(u, 'role.client.name') === COACH)).toBeTruthy();
    });

    // it('should get all auxiliaries and helpers users (company A), role as an array of strings', async () => {
    //   const res = await app.inject({
    //     method: 'GET',
    //     url: `/users?company=${authCompany._id}&role=helper&role=auxiliary`,
    //     headers: { Cookie: `alenvi_token=${authToken}` },
    //   });

    //   expect(res.statusCode).toBe(200);
    //   expect(res.result.data.users.length).toBe(5);
    //   expect(res.result.data.users.every(u => [HELPER, AUXILIARY]
    //     .includes(get(u, 'role.client.name')))).toBeTruthy();
    // });

    it('should return 400 if wrong role in query', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users?company=${authCompany._id}&role=Babouin`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return a 403 if company is not the same and does not have a vendor role', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users?company=${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get all users from all companies', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const countUserInDB = userList.length + usersSeedList.length + usersFromOtherCompanyList.length;
      expect(res.result.data.users.length).toBe(countUserInDB);
    });

    // it('should get users from an other companies', async () => {
    //   const res = await app.inject({
    //     method: 'GET',
    //     url: `/users?company=${otherCompany._id}`,
    //     headers: { Cookie: `alenvi_token=${authToken}` },
    //   });

    //   expect(res.statusCode).toBe(200);
    //   expect(res.result.data.users.length).toBe(usersFromOtherCompanyList.length);
    // });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
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

describe('USERS ROUTES - GET /users/exists', () => {
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
      expect(res.result.data.exists).toBeTruthy();
      expect(res.result.data.user).toEqual({});
    });
  });

  describe('TRAINER', () => {
    beforeEach(async () => {
      authToken = await getToken('trainer');
    });

    it('should return true and user if user exists', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/exists?email=${usersSeedList[0].local.email}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.exists).toBe(true);
      expect(res.result.data.user).toEqual({
        ...pick(usersSeedList[0],
          ['role', '_id']),
        company: authCompany._id,
        userCompanyList: [
          { company: companyWithoutSubscription._id, endDate: '2021-12-31T23:00:00.000Z' },
          { company: authCompany._id },
        ],
      });
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
      { name: 'auxiliary_without_company', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
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
            userCompanyList: [{ company: authCompany._id }],
          });
        }
      });
    });
  });
});

describe('USERS ROUTES - GET /users/sector-histories', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    // it('should get all auxiliary users', async () => {
    //   const res = await app.inject({
    //     method: 'GET',
    //     url: `/users/sector-histories?company=${authCompany._id}`,
    //     headers: { Cookie: `alenvi_token=${authToken}` },
    //   });

    //   expect(res.statusCode).toBe(200);
    //   expect(res.result.data.users.length).toBe(7);
    // });

    it('should return a 403 if try to get other company', async () => {
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
      { name: 'trainer', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
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

describe('USERS ROUTES - GET /users/learners', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINER', () => {
    beforeEach(async () => {
      authToken = await getToken('trainer');
      UtilsMock.mockCurrentDate('2022-12-20T15:00:00.000Z');
    });
    afterEach(() => {
      UtilsMock.unmockCurrentDate();
    });

    it('should return all learners', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users/learners',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const countUserInDB = userList.length + usersSeedList.length + usersFromOtherCompanyList.length;
      expect(res.result.data.users.length).toEqual(countUserInDB);
    });

    it('should return active learners from a specific company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/learners?companies=${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.every(u => UtilsHelper.areObjectIdsEquals(u.company._id, authCompany._id)))
        .toBeTruthy();
    });

    it('should return active learners from several companies', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/learners?companies=${authCompany._id}&companies=${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.every(u => UtilsHelper.areObjectIdsEquals(u.company._id, authCompany._id) ||
        UtilsHelper.areObjectIdsEquals(u.company._id, otherCompany._id))).toBeTruthy();
    });
  });

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
      UtilsMock.mockCurrentDate('2022-12-20T15:00:00.000Z');
    });
    afterEach(() => {
      UtilsMock.unmockCurrentDate();
    });

    it('should return 200 if coach requests active learners from his company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/learners?companies=${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.length).toBe(8);
      expect(res.result.data.users.every(u => UtilsHelper.areObjectIdsEquals(u.company._id, authCompany._id)))
        .toBeTruthy();
    });
  });

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return 403 if client admin request learners from other company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/learners?companies=${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/users/learners',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('USERS ROUTES - GET /users/active', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    // it('should get all active auxiliaries (company A)', async () => {
    //   const res = await app.inject({
    //     method: 'GET',
    //     url: `/users/active?company=${authCompany._id}&role=auxiliary`,
    //     headers: { Cookie: `alenvi_token=${authToken}` },
    //   });

    //   expect(res.statusCode).toBe(200);
    //   expect(res.result.data.users.length).toBe(3);
    //   expect(res.result.data.users.every(u => u.isActive)).toBeTruthy();
    //   expect(res.result.data.users.every(u => u.role.client.name === 'auxiliary')).toBeTruthy();
    // });

    it('should return a 403 if not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/active?email=${helperFromOtherCompany.local.email}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // describe('TRAINING_ORGANISATION_MANAGER', () => {
  //   beforeEach(async () => {
  //     authToken = await getToken('training_organisation_manager');
  //   });

  //   it('should get all active users from other company if role vendor', async () => {
  //     const res = await app.inject({
  //       method: 'GET',
  //       url: `/users/active?company=${otherCompany._id}`,
  //       headers: { Cookie: `alenvi_token=${authToken}` },
  //     });

  //     expect(res.statusCode).toBe(200);
  //     expect(res.result.data.users.length).toBe(1);
  //     expect(res.result.data.users.every(u => u.isActive)).toBeTruthy();
  //   });
  // });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
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

describe('USERS ROUTES - GET /users/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should return user', async () => {
      const userId = usersSeedList[0]._id;
      const res = await app.inject({
        method: 'GET',
        url: `/users/${userId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(UtilsHelper.areObjectIdsEquals(res.result.data.user._id, userId)).toBeTruthy();
    });

    it('should return 200 if user will be in company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/${usersSeedList[13]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should return a 404 if user is not from same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/${auxiliaryFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('TRAINER', () => {
    beforeEach(async () => {
      authToken = await getToken('trainer');
    });

    it('should return trainer', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/${trainer._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(UtilsHelper.areObjectIdsEquals(res.result.data.user._id, trainer._id)).toBeTruthy();
      expect(res.result.data.user.role.vendor).toBeDefined();
    });
  });

  describe('NO_ROLE_NO_COMPANY', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);
    });

    it('should return user if it is me - no role no company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${noRoleNoCompany._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if it is not me - no role no company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${usersSeedList[0]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
    ];
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

describe('USERS ROUTES - PUT /users/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should update the user', async () => {
      const userId = usersSeedList[0]._id.toHexString();
      const updatePayload = { identity: { firstname: 'Riri' }, local: { email: 'riri@alenvi.io' } };
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
      const userId = usersSeedList[0]._id;
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
      expect(updatedUser.sector).toEqual(userSectors[1]._id);

      const userSectorHistory = sectorHistories
        .filter(history => UtilsHelper.areObjectIdsEquals(history.auxiliary, userId));
      const sectorHistoryCount = await SectorHistory.countDocuments({ auxiliary: userId, company: authCompany._id });
      expect(sectorHistoryCount).toBe(userSectorHistory.length + 1);
    });

    it('should delete unrelevant sector histories on update', async () => {
      const userId = usersSeedList[0]._id;
      const firstResponse = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: { sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(firstResponse.statusCode).toBe(200);

      const secondResponse = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: { sector: userSectors[2]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(secondResponse.statusCode).toBe(200);

      const updatedUser = await User.findById(userId)
        .populate({ path: 'sector', select: '_id sector', match: { company: authCompany._id } })
        .lean();

      expect(updatedUser.sector).toEqual(userSectors[2]._id);
      const histories = await SectorHistory.find({ auxiliary: userId, company: authCompany._id }).lean();
      expect(histories.some(sh => UtilsHelper.areObjectIdsEquals(sh.sector, userSectors[0]._id))).toBeTruthy();
      expect(histories.some(sh => UtilsHelper.areObjectIdsEquals(sh.sector, userSectors[1]._id))).toBeFalsy();
      expect(histories.some(sh => UtilsHelper.areObjectIdsEquals(sh.sector, userSectors[2]._id))).toBeTruthy();
    });

    it('should return 200, but not create sectorhistory if it is same sector', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id}`,
        payload: { sector: userSectors[0]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const countHistory = await SectorHistory
        .countDocuments({ auxiliary: usersSeedList[0]._id, company: authCompany._id, sector: userSectors[0]._id });
      expect(countHistory).toEqual(1);
    });

    it('should update sectorHistory if auxiliary does not have contract', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[1]._id}`,
        payload: { sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const countHistories = await SectorHistory
        .countDocuments({ auxiliary: usersSeedList[1]._id, company: authCompany._id, sector: userSectors[1]._id });
      expect(countHistories).toEqual(1);
    });

    it('should update sectorHistory if auxiliary contract is between contracts', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[4]._id}`,
        payload: { sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);

      const countHistories = await SectorHistory
        .countDocuments({ auxiliary: usersSeedList[4]._id, company: authCompany._id, sector: userSectors[1]._id });
      expect(countHistories).toEqual(1);
    });

    it('should create sectorHistory if auxiliary does not have one', async () => {
      const role = await Role.find({ name: 'auxiliary' }).lean();
      const previousHistories = await SectorHistory
        .find({ auxiliary: usersSeedList[8]._id, company: authCompany._id, sector: userSectors[1]._id })
        .lean();

      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[8]._id}`,
        payload: { role: role._id, sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(previousHistories).toHaveLength(0);
      const histories = await SectorHistory
        .find({ auxiliary: usersSeedList[8]._id, company: authCompany._id, sector: userSectors[1]._id })
        .lean();
      expect(histories.length).toEqual(1);
      expect(histories[0].startDate).toBeUndefined();
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
      const userId = usersSeedList[7]._id;
      const auxiliaryPayload = {
        identity: { title: 'mr', lastname: 'Auxiliary', firstname: 'test' },
        contact: { phone: '0600000001' },
        local: { email: usersSeedList[7].local.email },
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

    it('should add helper role to user', async () => {
      const role = await Role.findOne({ name: HELPER }).lean();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[10]._id}`,
        payload: { customer: customer._id, role: role._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const userUpdated = await User.countDocuments({ _id: usersSeedList[10]._id, 'role.client': role._id });
      expect(userUpdated).toBeTruthy();
    });

    it('should add helper role and company to user with previously no company', async () => {
      const role = await Role.findOne({ name: HELPER }).lean();
      const userId = usersSeedList[11]._id;
      const noCompanyBefore = !await UserCompany.countDocuments({ user: userId });

      const res = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload: { customer: customer._id, role: role._id, company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const updatedRole = await User.countDocuments({ _id: userId, 'role.client': role._id });
      const updatedCompany = await UserCompany.countDocuments({
        user: userId,
        startDate: CompaniDate().startOf(DAY).toISO(),
      });
      expect(updatedRole).toBeTruthy();
      expect(updatedCompany).toBeTruthy();
      expect(noCompanyBefore).toBeTruthy();
    });

    it('should update previously detached learner with new company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${traineeWhoLeftOtherCompany._id.toHexString()}`,
        payload: { company: authCompany._id, userCompanyStartDate: '2022-12-20T12:00:00.000Z' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const createdUserCompany = await UserCompany.countDocuments({
        user: traineeWhoLeftOtherCompany._id,
        company: authCompany._id,
        startDate: '2022-12-19T23:00:00.000Z',
      });
      expect(createdUserCompany).toBeTruthy();
    });

    it('should add auxiliary in the future', async () => {
      const role = await Role.find({ name: 'auxiliary' }).lean();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[13]._id.toHexString()}`,
        payload: { role: role._id, sector: userSectors[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const historyCount = await SectorHistory
        .countDocuments({ auxiliary: usersSeedList[13]._id, company: authCompany._id, sector: userSectors[1]._id });
      expect(historyCount).toBeTruthy();
    });

    it('should not add helper role to user if customer is not from the same company as user', async () => {
      const role = await Role.findOne({ name: HELPER }).lean();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[10]._id}`,
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
    });

    it('should return a 404 error if user is not from the same company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${helperFromOtherCompany._id}`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(404);
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
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id}`,
        payload: { contact: { phone: '09876' } },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should not update a user if trying to update password', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id}`,
        payload: { local: { password: '123456!eR' } },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should update trainer', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[11]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          identity: { firstname: 'trainerUpdate' },
          biography: 'It\'s my life',
          company: authCompany._id,
          userCompanyStartDate: '2022-12-12T12:00:00.000Z',
        },
      });

      expect(res.statusCode).toBe(200);

      const updatedTrainer = await User
        .countDocuments({ _id: usersSeedList[11]._id, 'identity.firstname': 'trainerUpdate' });
      expect(updatedTrainer).toBeTruthy();

      const createdUserCompany = await UserCompany.countDocuments({
        user: usersSeedList[11]._id,
        company: authCompany._id,
        startDate: '2022-12-11T23:00:00.000Z',
      });
      expect(createdUserCompany).toBeTruthy();
    });

    it('should update previously detached learner with new company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${traineeWhoLeftOtherCompany._id.toHexString()}`,
        payload: { company: authCompany._id, userCompanyStartDate: '2022-12-20T12:00:00.000Z' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const createdUserCompany = await UserCompany.countDocuments({
        user: traineeWhoLeftOtherCompany._id,
        company: authCompany._id,
        startDate: '2022-12-19T23:00:00.000Z',
      });
      expect(createdUserCompany).toBeTruthy();
    });

    it('should return 409 if trying to create usercompany for same company for user (current or futur)', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[1]._id.toHexString()}`,
        payload: { company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(409);
    });

    it('should return 200 if company is in payload and userCompanyStartDate is not', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[11]._id.toHexString()}`,
        payload: { company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const createdUserCompany = await UserCompany.countDocuments({
        user: usersSeedList[11]._id,
        company: authCompany._id,
        startDate: CompaniDate().startOf(DAY).toISO(),
      });
      expect(createdUserCompany).toBeTruthy();
    });

    it('should return 400 if userCompanyStartDate is in payload and company is not', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id.toHexString()}`,
        payload: { userCompanyStartDate: '2022-11-12T12:30:00.000Z' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 409 if trying to link company on a user with current company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${helperFromOtherCompany._id}`,
        payload: { company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(409);
      expect(res.result.message).toBe('Ce compte est déjà rattaché à une structure.');
    });
  });

  describe('TRAINER', () => {
    beforeEach(async () => {
      authToken = await getToken('trainer');
    });

    it('should update allowed field of user', async () => {
      const updatePayload = {
        identity: { firstname: 'Riri' },
        contact: { phone: '0102030405' },
        local: { email: 'norole.nocompany@userseed.fr' },
        company: otherCompany._id,
        userCompanyStartDate: '2022-12-10T00:00:00.000Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[12]._id.toHexString()}`,
        payload: updatePayload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const userUpdated = await User.countDocuments({ _id: usersSeedList[12]._id, 'identity.firstname': 'Riri' });
      expect(userUpdated).toBeTruthy();
    });

    it('should not update another field than allowed ones', async () => {
      const userId = noRoleNoCompany._id;
      const payload = {
        identity: { firstname: 'No', lastname: 'Body', socialSecurityNumber: 133333131 },
        contact: { phone: '0344543932' },
        local: { email: 'norole.nocompany@userseed.fr' },
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not update email with new value', async () => {
      const userId = noRoleNoCompany._id;
      const payload = {
        identity: { firstname: 'No', lastname: 'Body' },
        contact: { phone: '0344543932' },
        local: { email: 'newemail@mail.com' },
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('NO_ROLE_NO_COMPANY', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(usersSeedList[12].local);
    });

    it('should update user if it is me', async () => {
      const updatePayload = { identity: { firstname: 'Riri' }, local: { email: 'riri@alenvi.io' } };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[12]._id.toHexString()}`,
        payload: updatePayload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const userUpdated = await User.countDocuments({ _id: usersSeedList[12]._id, 'identity.firstname': 'Riri' });
      expect(userUpdated).toBeTruthy();
    });

    it('should not update another field than allowed ones', async () => {
      const userId = usersSeedList[12]._id;
      const payload = {
        identity: { firstname: 'No', lastname: 'Body' },
        contact: { phone: '0344543932' },
        local: { email: usersSeedList[12].local.email },
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
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'PUT',
          url: `/users/${usersSeedList[2]._id.toHexString()}`,
          payload: { identity: { firstname: 'Riri' } },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('USERS ROUTES - DELETE /users/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    const usersToDelete = [
      { clientRole: 'coach', expectedCode: 403 },
      { clientRole: 'auxiliary', expectedCode: 403 },
      { clientRole: 'planning_referent', expectedCode: 403 },
      { clientRole: 'auxiliary_without_company', expectedCode: 403 },
      { clientRole: '', expectedCode: 403 },
      { clientRole: 'helper', expectedCode: 200 },
    ];
    usersToDelete.forEach((test) => {
      it(`should return ${test.expectedCode} if deleting ${test.clientRole || 'user without role'}`, async () => {
        const role = rolesList.find(r => r.name === test.clientRole);
        const userToDelete = !test.clientRole
          ? usersSeedList.find(u => !u.role)
          : usersSeedList.find(u => UtilsHelper.areObjectIdsEquals(role._id, get(u, 'role.client')));

        let userCompanyExistBefore;
        let helperExistBefore;
        if (get(userToDelete, 'role.client') === helperRoleId) {
          userCompanyExistBefore = await UserCompany.countDocuments({ user: userToDelete._id });
          helperExistBefore = await Helper.countDocuments({ user: userToDelete._id });
        }

        const res = await app.inject({
          method: 'DELETE',
          url: `/users/${userToDelete._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(test.expectedCode);

        if (get(userToDelete, 'role.client') === helperRoleId) {
          const userCompanyExistAfter = await UserCompany.countDocuments({ user: userToDelete._id });
          const helperExistAfter = await Helper.countDocuments({ user: userToDelete._id });

          expect(userCompanyExistBefore).toBeTruthy();
          expect(helperExistBefore).toBeTruthy();
          expect(userCompanyExistAfter).toBeFalsy();
          expect(helperExistAfter).toBeFalsy();
        }
      });
    });

    it('should return a 404 error if user is not from same company', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/users/${helperFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 403 if try to delete my own account', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${coach._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('NO_ROLE_NO_COMPANY', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(usersSeedList[12].local);
    });

    it('should delete user and its data', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${usersSeedList[12]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const companyLinkRequest = await CompanyLinkRequest.countDocuments({ user: usersSeedList[12]._id });
      expect(companyLinkRequest).toBe(0);

      const activityHistories = await ActivityHistory.countDocuments({ user: usersSeedList[12]._id });
      expect(activityHistories).toBe(0);

      const course = await Course.countDocuments({ trainees: usersSeedList[12]._id });
      expect(course).toBe(0);
    });

    it('should return 403 if try to delete other account', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${usersSeedList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('HELPER', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(usersSeedList[3].local);
    });

    it('should return 403 if helper try to delete himself', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${usersSeedList[3]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
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

describe('USERS ROUTES - PUT /users/:id/certificates', () => {
  let authToken;
  const updatePayload = { certificates: { driveId: usersSeedList[0].administrative.certificates.driveId } };
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should update user by removing the passed certificate id', async () => {
      const certificatExistsBefore = await User.countDocuments({
        _id: usersSeedList[0]._id,
        'administrative.certificates.driveId': { $exists: true },
      });
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${usersSeedList[0]._id}/certificates`,
        payload: updatePayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const certificateRemoved = await User.countDocuments({
        _id: usersSeedList[0]._id,
        'administrative.certificates.driveId': { $exists: false },
      });
      expect(certificatExistsBefore).toBeTruthy();
      expect(certificateRemoved).toBeTruthy();
    });

    it('should return a 404 if user is not from same company', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${auxiliaryFromOtherCompany._id.toHexString()}/certificates`,
        payload: updatePayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should update user by removing certificate, if it is me', async () => {
      authToken = await getToken('auxiliary');

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${auxiliary._id.toHexString()}/certificates`,
        payload: updatePayload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
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
          url: `/users/${usersSeedList[1]._id.toHexString()}/certificates`,
          payload: updatePayload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('USERS ROUTES - POST /users/:id/gdrive/:drive_id/upload', () => {
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

  beforeEach(populateDB);

  describe('COACH', () => {
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
      expect(response.result.data.uploadedFile.id).toBe('qwerty');
      const userCount = await User.countDocuments({
        _id: usersSeedList[0]._id,
        'administrative.mutualFund': { driveId: 'qwerty', link: 'http://test.com/file.pdf' },
      });
      expect(userCount).toEqual(1);
      sinon.assert.calledOnce(addFileStub);
    });

    it('should return a 404 error if user is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${auxiliaryFromOtherCompany._id}/gdrive/${new ObjectId()}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
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

      const userCount = await User.countDocuments({
        _id: auxiliary._id,
        'administrative.mutualFund': { driveId: 'qwerty', link: 'http://test.com/file.pdf' },
      });
      expect(userCount).toEqual(1);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];
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

describe('USERS ROUTES - POST /users/:id/upload', () => {
  let authToken;
  let uploadUserMediaStub;
  beforeEach(() => {
    uploadUserMediaStub = sinon.stub(GCloudStorageHelper, 'uploadUserMedia');
  });
  afterEach(() => {
    uploadUserMediaStub.restore();
  });

  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add a user picture', async () => {
      const user = usersSeedList[0];
      const form = generateFormData({ fileName: 'user_image_test', file: 'yoyoyo' });
      uploadUserMediaStub.returns({ public_id: 'abcdefgh', link: 'https://alenvi.io' });

      const payload = await GetStream(form);
      const response = await app.inject({
        method: 'POST',
        url: `/users/${user._id}/upload`,
        payload,
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const updatedUser = await User.countDocuments({ _id: user._id, 'picture.link': 'https://alenvi.io' });
      expect(updatedUser).toBeTruthy();
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
      authToken = await getTokenByCredentials(noRoleNoCompany.local);

      const form = generateFormData({ fileName: 'user_image_test', file: 'yoyoyo' });
      uploadUserMediaStub.returns({ public_id: 'abcdefgh', link: 'https://alenvi.io' });

      const response = await app.inject({
        method: 'POST',
        url: `/users/${noRoleNoCompany._id.toHexString()}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const updatedUser = await User.countDocuments({ _id: noRoleNoCompany._id, 'picture.link': 'https://alenvi.io' });
      expect(updatedUser).toBeTruthy();
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
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

describe('USERS ROUTES - DELETE /users/:id/upload', () => {
  let authToken;
  let deleteUserMediaStub;
  beforeEach(() => {
    deleteUserMediaStub = sinon.stub(GCloudStorageHelper, 'deleteUserMedia');
  });
  afterEach(() => {
    deleteUserMediaStub.restore();
  });

  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
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
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${new ObjectId()}/upload`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should delete picture if it is me', async () => {
      const user = usersSeedList[0];
      authToken = await getTokenByCredentials(user.local);
      const pictureExistsBeforeDeletion = await User
        .countDocuments({ _id: user._id, 'picture.publicId': { $exists: true } });
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${user._id}/upload`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const isPictureDeleted = await User.countDocuments({ _id: user._id, 'picture.publicId': { $exists: false } });
      expect(pictureExistsBeforeDeletion).toBeTruthy();
      expect(isPictureDeleted).toBeTruthy();
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const user = usersSeedList[6];
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

describe('USERS ROUTES - POST /users/:id/drivefolder', () => {
  let authToken;
  let createFolderStub;
  beforeEach(() => {
    createFolderStub = sinon.stub(GDriveStorageHelper, 'createFolder');
  });
  afterEach(() => {
    createFolderStub.restore();
  });

  beforeEach(populateDB);

  describe('COACH', () => {
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
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];
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

describe('USERS ROUTES - POST /users/:id/expo-token', () => {
  let authToken;
  beforeEach(populateDB);

  describe('LOGGED_USER', () => {
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
      const updatedToken = await User.countDocuments({
        _id: usersSeedList[0]._id,
        formationExpoTokenList: { $in: 'ExponentPushToken[jeSuisUnNouvelIdExpo]' },
      });
      expect(updatedToken).toBeTruthy();
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

describe('USERS ROUTES - DELETE /users/:id/expo-token/:expoToken', () => {
  let authToken;
  beforeEach(populateDB);

  describe('LOGGED_USER', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(usersSeedList[0].local);
    });

    it('should remove formationExpoToken from formationExpoTokenList', async () => {
      const userId = usersSeedList[0]._id;
      const expoToken = usersSeedList[0].formationExpoTokenList[0];
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${userId}`
        + `/expo-token/${expoToken}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const tokenDeleted = await User.countDocuments({
        _id: userId,
        formationExpoTokenList: { $nin: expoToken },
      });
      expect(tokenDeleted).toBeTruthy();
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
