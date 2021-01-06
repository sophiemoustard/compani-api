const expect = require('expect');
const app = require('../../server');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('VERSION TEST', () => {
  beforeEach(() => {
    process.env.API_VERSION = '1.2.3';
    process.env.MOBILE_VERSION = ['1.2.0'];
  });
  afterEach(() => {
    process.env.API_VERSION = '';
    process.env.MOBILE_VERSION = '';
  });

  describe('POST /version/check-update', () => {
    it('should return that user does not have to update app (old version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/check-update?apiVersion=1',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeFalsy();
    });

    it('should return that user have to update app (old version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/check-update?apiVersion=0.2.3',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeTruthy();
    });

    it('should return that user does not have to update app (new version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/check-update?mobileVersion=1.2.0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeFalsy();
    });

    it('should return that user have to update app (new version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/check-update?mobileVersion=1.1.9',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeTruthy();
    });
  });
});
