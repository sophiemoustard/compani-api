const expect = require('expect');
const app = require('../../server');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('USERS TEST', () => {
  describe('POST /version/check-update', () => {
    it('should check if user should update app', async () => {
      process.env.API_VERSION = '1.2.3';
      const response = await app.inject({
        method: 'GET',
        url: '/version/check-update?apiVersion=1',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeFalsy();
    });
  });
});
