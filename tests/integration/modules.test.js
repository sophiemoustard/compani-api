const expect = require('expect');
const app = require('../../server');
const { populateDB, modulesList } = require('./seed/modulesSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PROGRAMS ROUTES - PUT /modules/{_id}/activity', () => {
  let authToken = null;
  beforeEach(populateDB);
  const payload = { title: 'new activity' };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create activity', async () => {
      const moduleId = modulesList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: `/modules/${moduleId.toHexString()}/activity`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.module._id).toEqual(moduleId);
      expect(response.result.data.module.activities.length).toEqual(1);
    });

    it('should return a 400 if missing title', async () => {
      const moduleId = modulesList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: `/modules/${moduleId.toHexString()}/activity`,
        payload: { },
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
        const moduleId = modulesList[0]._id;
        const response = await app.inject({
          method: 'POST',
          payload: { title: 'new name' },
          url: `/modules/${moduleId.toHexString()}/activity`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
