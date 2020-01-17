const expect = require('expect');
const app = require('../../server');
const omit = require('lodash/omit');
const { populateDB, establishmentsList } = require('./seed/establishmentsSeed');
const { getToken, authCompany } = require('./seed/authenticationSeed');
const Establishment = require('../../src/models/Establishment');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ESTABLISHMENTS ROUTES', () => {
  let authToken = null;
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

  describe('Admin', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should create a new establishment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.establishment).toMatchObject({ ...payload, company: authCompany._id });
      const establishmentsCount = await Establishment.countDocuments({ company: authCompany });
      expect(establishmentsCount).toBe(establishmentsList.length + 1);
    });

    const falsyPaths = [
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

    falsyPaths.forEach((path) => {
      it(`should return a 400 error if param ${path} is missing`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/establishments',
          payload: omit({ ...payload }, path),
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 400 error if name contains invalid character', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, name: 'Terre\\Lune' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if name length is greater than 32 caracters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, name: 'qwertyuioplkjhgfdsamnbvcxzpoiuytrewq' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if siret length is greater than 14 caracters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, siret: '12345678900987654321' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if siret contains letters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, siret: '1234567890098B' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if phone number is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, siret: '+33789345690' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if work health service code is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, workHealthService: 'MT500' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if urssaf code is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/establishments',
        payload: { ...payload, urssafCode: '207' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/establishments',
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
