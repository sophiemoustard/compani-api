const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { populateDB, partnerOrganizationsList } = require('./seed/partnerOrganizationsSeed');
const { getToken } = require('./seed/authenticationSeed');
const { authCompany } = require('../seed/companySeed');
const { areObjectIdsEquals } = require('../../src/helpers/utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PARTNER ORGANIZATION ROUTES - POST /partnerorganizations', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should add a partner organization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          name: 'Etchebest Corporation',
          phone: '0123456789',
          email: 'sku@alenvi.io',
          address: {
            fullAddress: '24 avenue Daumesnil 75012 Paris',
            zipCode: '75012',
            city: 'Paris',
            street: '24 avenue Daumesnil',
            location: { type: 'Point', coordinates: [2.377133, 48.801389] },
          },
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if invalid phone', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Etchebest Corporation', phone: 'local' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if invalid address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Etchebest Corporation', address: 'IP' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Etchebest Corporation', email: 'toi de tes affaires' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if name already exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Gooogle' },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/partnerorganizations',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { name: 'Sku Corporation' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PARTNER ORGANIZATION ROUTES - GET /partnerorganizations', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should list partner organizations from my company', async () => {
      const partnerOrganizationsFromAuthCompany = partnerOrganizationsList
        .filter(po => areObjectIdsEquals(po.company, authCompany._id));

      const response = await app.inject({
        method: 'GET',
        url: '/partnerorganizations',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.partnerOrganizations.length).toBe(partnerOrganizationsFromAuthCompany.length);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/partnerorganizations',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PARTNER ORGANIZATION ROUTES - GET /partnerorganizations/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should return a partner organization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if partner organization doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/partnerorganizations/${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if partner organization isn\'t from auth company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/partnerorganizations/${partnerOrganizationsList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/partnerorganizations/${partnerOrganizationsList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PARTNER ORGANIZATION ROUTES - PUT /partnerorganizations/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should update a partner organization', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'skusku' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if name is not a string', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: null },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if phone is not a phoneNumber', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { phone: 'coucou' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if address is not a address', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { address: 'coucou' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if email is not a email', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { email: 'coucou' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if partner organization doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partnerorganizations/${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'skusku' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if partnerOrganization isn\'t from auth company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partnerorganizations/${partnerOrganizationsList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'skusku' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 if name is from an already existing partner organization', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Gooogle' },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/partnerorganizations/${partnerOrganizationsList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { name: 'skusku' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PARTNER ORGANIZATION ROUTES - POST /partnerorganizations/{_id}/partners', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should create a partner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}/partners`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { firstname: 'Docteur', lastname: 'Maboul' }, job: 'doctor' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 400 if missing lastname', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}/partners`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { firstname: 'Docteur' }, job: 'doctor' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if missing identity', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}/partners`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { job: 'doctor' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if job isn\'t listed', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}/partners`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { firstname: 'Leo', lastname: 'Ferreira' }, job: 'web_dev' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if email is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}/partners`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { firstname: 'Docteur', lastname: 'Maboul' }, email: 'docteur.maboul' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if phone is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/partnerorganizations/${partnerOrganizationsList[0]._id}/partners`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { firstname: 'Docteur', lastname: 'Maboul' }, phone: 'skusku' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 404 if partnerOrganization doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/partnerorganizations/${new ObjectID()}/partners`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { firstname: 'Docteur', lastname: 'Maboul' } },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if partnerOrganization isn\'t from auth company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/partnerorganizations/${partnerOrganizationsList[1]._id}/partners`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { identity: { firstname: 'Docteur', lastname: 'Maboul' } },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/partnerorganizations/${partnerOrganizationsList[0]._id}/partners`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { identity: { firstname: 'Docteur', lastname: 'Maboul' }, job: 'doctor' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
