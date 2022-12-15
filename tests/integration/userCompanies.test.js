const expect = require('expect');
const { ObjectId } = require('mongodb');
const app = require('../../server');
const { getTokenByCredentials, getToken } = require('./helpers/authentication');
const UserCompany = require('../../src/models/UserCompany');
const { userCompanies, populateDB, usersSeedList } = require('./seed/userCompaniesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('USER COMPANIES ROUTES - PUT /usercompanies/{id} #tag', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(usersSeedList[1].local);
    });

    it('should detach user Company', async () => {
      const userCompanyId = userCompanies[0]._id.toHexString();
      const payload = { endDate: '2022-12-01T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);

      const userCount = await UserCompany.countDocuments({ _id: userCompanyId, endDate: '2022-12-01T22:59:59.999Z' });
      expect(userCount).toEqual(1);
    });

    it('should return a 400 if endDate is not defined in payload', async () => {
      const userCompanyId = userCompanies[0]._id.toHexString();
      const payload = { endDate: '' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return a 403 if user has a role', async () => {
      const userCompanyId = userCompanies[7]._id;
      const payload = { endDate: '2022-12-25T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if user Company doesnt exist', async () => {
      const userCompanyId = new ObjectId();
      const payload = { endDate: '2022-12-25T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if user is from an other company', async () => {
      const userCompanyId = userCompanies[2]._id.toHexString();
      const payload = { endDate: '2022-12-25T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if user doesnt exist', async () => {
      const userCompanyId = userCompanies[3]._id.toHexString();
      const payload = { endDate: '2022-12-25T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if detachment date is before user company startdate', async () => {
      const userCompanyId = userCompanies[0]._id.toHexString();
      const payload = { endDate: '2022-08-01T10:00:00.000Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if user company startDate is in futur', async () => {
      const userCompanyId = userCompanies[0]._id.toHexString();
      const payload = { endDate: '2022-08-17T10:00:00.000Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if detachment date is before first trainee\'s addition in course history', async () => {
      const userCompanyId = userCompanies[0]._id.toHexString();
      const payload = { endDate: '2022-08-17T10:00:00.000Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(usersSeedList[3].local);
    });

    it('should detach user Company', async () => {
      const userCompanyId = userCompanies[5]._id.toHexString();
      const payload = { endDate: '2022-12-01T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);

      const userCount = await UserCompany.countDocuments({ _id: userCompanyId, endDate: '2022-12-01T22:59:59.999Z' });
      expect(userCount).toEqual(1);
    });

    it('should return a 400 if endDate is not defined in payload', async () => {
      const userCompanyId = userCompanies[5]._id.toHexString();
      const payload = { endDate: '' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return a 403 if user has a role', async () => {
      const userCompanyId = userCompanies[7]._id;
      const payload = { endDate: '2022-12-25T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if user Company doesnt exist', async () => {
      const userCompanyId = new ObjectId();
      const payload = { endDate: '2022-12-25T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if user is from an other company', async () => {
      const userCompanyId = userCompanies[2]._id.toHexString();
      const payload = { endDate: '2022-12-25T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if user doesnt exist', async () => {
      const userCompanyId = userCompanies[3]._id.toHexString();
      const payload = { endDate: '2022-12-25T22:59:59.999Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if detachment date is before user company startdate', async () => {
      const userCompanyId = userCompanies[5]._id.toHexString();
      const payload = { endDate: '2021-11-17T10:00:00.000Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if user company startDate is in futur', async () => {
      const userCompanyId = userCompanies[5]._id.toHexString();
      const payload = { endDate: '2022-08-17T10:00:00.000Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 403 if detachment date is before first trainee\'s addition in course history', async () => {
      const userCompanyId = userCompanies[5]._id.toHexString();
      const payload = { endDate: '2022-08-17T10:00:00.000Z' };

      const res = await app.inject({
        method: 'PUT',
        url: `/usercompanies/${userCompanyId}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'planning_referent', expectedCode: 403, erp: true },
      { name: 'trainer', expectedCode: 403, erp: false },
    ];

    const userCompanyId = userCompanies[0]._id.toHexString();
    const payload = { endDate: '2022-12-01T22:59:59.999Z' };

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);

        const res = await app.inject({
          method: 'PUT',
          url: `/usercompanies/${userCompanyId}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(res.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
