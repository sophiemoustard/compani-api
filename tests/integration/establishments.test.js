const expect = require('expect');
const app = require('../../server');
const { populateDB, establishmentsList } = require('./seed/establishmentsSeed');
const { getToken } = require('./seed/authenticationSeed');

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
      expect(response.result.data)
    });
  });
});
