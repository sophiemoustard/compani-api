const expect = require('expect');
const { populateDB, distanceMatrixList } = require('./seed/distanceMatrixSeed');
const app = require('../../server');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('DISTANCE MATRIX ROUTES', () => {
  let authToken = null;
  before(populateDB);
  beforeEach(async () => {
    authToken = await getToken('coach');
  });

  describe('GET /distancematrix', () => {
    it('should get all distance matrix', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/distancematrix',
        headers: { 'x-access-token': authToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.distanceMatrices).toHaveLength(distanceMatrixList.length);
    });
  });
});
