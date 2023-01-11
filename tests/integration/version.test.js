const { expect } = require('expect');
const app = require('../../server');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('VERSION TEST', () => {
  beforeEach(() => {
    process.env.API_VERSION = '2';
    process.env.FORMATION_MOBILE_VERSION = ['1.2.0'];
    process.env.ERP_MOBILE_VERSION = ['2.8.0'];
  });
  afterEach(() => {
    process.env.API_VERSION = '';
    process.env.FORMATION_MOBILE_VERSION = '';
    process.env.ERP_MOBILE_VERSION = '';
  });

  describe('POST /version/check-update', () => {
    it('should return true (old version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/check-update?apiVersion=2',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeTruthy();
    });
  });

  describe('POST /version/should-update', () => {
    it('should return false - app formation (without appName)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?mobileVersion=1.2.0',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeFalsy();
    });

    it('should return true - app formation (without appName)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?mobileVersion=1.1.9',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeTruthy();
    });

    it('should return false - app formation (new version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?mobileVersion=1.2.0&appName=formation',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeFalsy();
    });

    it('should return true - app formation (new version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?mobileVersion=1.1.9&appName=formation',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeTruthy();
    });

    it('should return false - app erp (new version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?mobileVersion=2.8.0&appName=erp',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeFalsy();
    });

    it('should return true - app erp (new version)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?mobileVersion=1.7.3&appName=erp',
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.mustUpdate).toBeTruthy();
    });

    it('should return 400 if missing mobileVersion', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?appName=erp',
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if appName is neither erp nor formation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version/should-update?mobileVersion=1.7.3&appName=poiuytrtyu',
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
