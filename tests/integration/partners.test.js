const { expect } = require('expect');
const app = require('../../server');
const { populateDB, partnersList } = require('./seed/partnersSeed');
const { getToken } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
const { areObjectIdsEquals } = require('../../src/helpers/utils');
const Partner = require('../../src/models/Partner');

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
      { name: 'auxiliary_without_company', expectedCode: 403 },
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

describe('PARTNERS ROUTES - PUT /partners/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should update partner', async () => {
      const payload = {
        identity: { firstname: 'Ulysse', lastname: 'TeDatente' },
        email: 'skulysse@alenvi.io',
        phone: '0712345678',
        job: 'doctor',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/partners/${partnersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const partnerUpdated = await Partner
        .countDocuments({ ...payload, _id: partnersList[0]._id });
      expect(partnerUpdated).toEqual(1);
    });

    it('should return 400 if empty payload', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partners/${partnersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if phone is wrong type', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partners/${partnersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { phone: 'skusku' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if email is wrong type', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partners/${partnersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { email: 'skusku' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if name is null', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partners/${partnersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { lastname: '' } },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if job is invalid', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partners/${partnersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { job: 'happiness_manager' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if partner is from an other compani', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partners/${partnersList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { lastname: 'bonjour' } },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/partners/${partnersList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: {
            identity: { firstname: 'Ulysse', lastname: 'SageBrésilien' },
            email: 'skulysse@alenvi.io',
            phone: '0712345678',
          },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
