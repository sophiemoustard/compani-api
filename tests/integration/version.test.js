const expect = require('expect');
const app = require('../../server');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('VERSION TEST', () => {
  beforeEach(() => {
    process.env.API_VERSION = '2';
    process.env.MOBILE_VERSION = ['1.2.0'];
  });
  afterEach(() => {
    process.env.API_VERSION = '';
    process.env.MOBILE_VERSION = '';
  });

  describe('POST /version/check-update', () => {
    it('should return false (old version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/check-update?apiVersion=2',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeFalsy();
    });
  });

  describe('POST /version/should-update', () => {
    it('should return false (new version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?mobileVersion=1.2.0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeFalsy();
    });

    it('should return true (new version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?mobileVersion=1.1.9',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeTruthy();
    });
  });
});
