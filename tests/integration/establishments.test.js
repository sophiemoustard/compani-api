const { expect } = require('expect');
const omit = require('lodash/omit');
const app = require('../../server');
const {
  populateDB,
  establishmentsList,
  establishmentFromOtherCompany,
  userFromOtherCompany,
} = require('./seed/establishmentsSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
const Establishment = require('../../src/models/Establishment');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ESTABLISHMENTS ROUTES - POST /establishments', () => {
  let authToken;
  const payload = {
    name: 'Titi',
    siret: '13605658901234',
    address: {
      street: '42, avenue des Colibris',
      fullAddress: '42, avenue des Colibris 75020 Paris',
      zipCode: '75020',
      city: 'Paris',
      location: {
        type: 'Point',
        coordinates: [4.849302, 2.90887],
      },
    },
    phone: '0113956789',
    workHealthService: 'MT01',
    urssafCode: '117',
  };

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a new establishment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.establishment).toMatchObject({ ...payload, company: authCompany._id });
      const establishmentsCount = await Establishment.countDocuments({ company: authCompany._id });
      expect(establishmentsCount).toBe(establishmentsList.length + 1);
    });

    const missingParams = [
      'name',
      'siret',
      'address.street',
      'address.fullAddress',
      'address.zipCode',
      'address.city',
      'address.location.type',
      'address.location.coordinates',
      'phone',
      'workHealthService',
      'urssafCode',
    ];

    missingParams.forEach((path) => {
      it(`should return a 400 error if param ${path} is missing`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/establishments',
          payload: omit({ ...payload }, path),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 400 error if name contains invalid character', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, name: 'Terre\\Lune' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if name length is greater than 32 caracters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, name: 'qwertyuioplkjhgfdsamnbvcxzpoiuytrewq' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if siret length is greater than 14 caracters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, siret: '12345678900987654321' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if siret contains letters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, siret: '1234567890098B' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if phone number is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, phone: '+33789345690' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if work health service code is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, workHealthService: 'MT500' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if urssaf code is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, urssafCode: '207' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 error if siret already exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, siret: '12345678901234' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/establishments',
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ESTABLISHMENTS ROUTES - PUT /establishments/:id', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should update an establishment', async () => {
      const payload = { name: 'Tutu', siret: '98765432109876' };
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentsList[0]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.establishment).toMatchObject(payload);
    });

    it('should return a 400 error if name contains invalid character', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentsList[0]._id}`,
        payload: { name: 'Terre\\Lune' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if name length is greater than 32 caracters', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentsList[0]._id}`,
        payload: { name: 'qwertyuioplkjhgfdsamnbvcxzpoiuytrewq' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if siret length is greater than 14 caracters', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentsList[0]._id}`,
        payload: { siret: '12345678900987654321' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if siret contains letters', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentsList[0]._id}`,
        payload: { siret: '1234567890098B' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if phone number is invalid', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentsList[0]._id}`,
        payload: { phone: '+33789345690' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if work health service code is invalid', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentsList[0]._id}`,
        payload: { workHealthService: 'MT500' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if urssaf code is invalid', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentsList[0]._id}`,
        payload: { urssafCode: '207' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 404 error if user is not from same company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentFromOtherCompany._id}`,
        payload: { urssafCode: '117' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 409 error if siret already exists', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/establishments/${establishmentsList[0]._id}`,
        payload: { siret: '09876543210987' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/establishments/${establishmentsList[0]._id}`,
          payload: { name: 'Tutu' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ESTABLISHMENTS ROUTES - GET /establishments', () => {
  let authToken;
  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should return establishments (company A)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/establishments',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.establishments).toHaveLength(establishmentsList.length);
    });

    it('should return establishments (company B)', async () => {
      authToken = await getTokenByCredentials(userFromOtherCompany.local);
      const response = await app.inject({
        method: 'GET',
        url: '/establishments',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.establishments).toHaveLength(1);
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
        const response = await app.inject({
          method: 'GET',
          url: '/establishments',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ESTABLISHMENTS ROUTES - DELETE /etablishments/:id', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete establishment', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/establishments/${establishmentsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const establishmentsCount = await Establishment.countDocuments({ company: authCompany._id });
      expect(establishmentsCount).toBe(establishmentsList.length - 1);
    });

    it('should return a 403 error if establishment has users attached', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/establishments/${establishmentsList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 404 error if establishment is not from same company as user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/establishments/${establishmentFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/establishments/${establishmentsList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
