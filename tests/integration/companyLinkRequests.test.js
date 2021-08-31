const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { populateDB, userWithAlreadyCompanyLinkRequest } = require('./seed/companyLinkRequestsSeed');
const { getTokenByCredentials } = require('./helpers/authentication');
const { noRoleNoCompany, noRole } = require('../seed/authUsersSeed');
const { authCompany } = require('../seed/authCompaniesSeed');
const CompanyLinkRequest = require('../../src/models/CompanyLinkRequest');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('POST /companylinkrequests', () => {
  let authToken;

  describe('LOGGED USER', () => {
    beforeEach(populateDB);

    it('should create a company link request', async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);

      const response = await app.inject({
        method: 'POST',
        url: '/companylinkrequests',
        payload: { company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const companyLinkRequestsCount = await CompanyLinkRequest.countDocuments({ user: noRoleNoCompany._id });
      expect(companyLinkRequestsCount).toEqual(1);
    });

    it('should not create a company link request if user already has a company', async () => {
      authToken = await getTokenByCredentials(noRole.local);

      const response = await app.inject({
        method: 'POST',
        url: '/companylinkrequests',
        payload: { company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not create a company link request if company does not exist', async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);

      const response = await app.inject({
        method: 'POST',
        url: '/companylinkrequests',
        payload: { company: new ObjectID() },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should not create a company link request if user already has a company link request', async () => {
      authToken = await getTokenByCredentials(userWithAlreadyCompanyLinkRequest.local);

      const response = await app.inject({
        method: 'POST',
        url: '/companylinkrequests',
        payload: { company: authCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
