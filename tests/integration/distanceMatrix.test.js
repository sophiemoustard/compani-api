const expect = require('expect');
const { populateDistanceMatrix, distanceMatrixList } = require('./seed/distanceMatrixSeed');
const { getToken } = require('./seed/usersSeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('DISTANCE MATRIX ROUTES', () => {
  let token = null;
  before(populateDistanceMatrix);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('GET /distancematrix', () => {
    it('should get all distance matrix', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/distancematrix',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.distanceMatrix).toHaveLength(distanceMatrixList.length);
    });
  });
});
