const expect = require('expect');
const app = require('../../server');
const { populateDB, partnersList } = require('./seed/partnersSeed');
const { getToken } = require('./seed/authenticationSeed');
const { authCompany } = require('../seed/companySeed');
const { areObjectIdsEquals } = require('../../src/helpers/utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PARTNERS ROUTES - GET /partners', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should list partner from my company', async () => {
      const partnerFromAuthCompany = partnersList
        .filter(partner => areObjectIdsEquals(partner.company, authCompany._id));
      const response = await app.inject({
        method: 'GET',
        url: '/partners',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.partners.length).toBe(partnerFromAuthCompany.length);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/partners',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
