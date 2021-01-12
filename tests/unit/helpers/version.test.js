const expect = require('expect');
const VersionHelper = require('../../../src/helpers/version');

describe('shouldUpdate', () => {
  beforeEach(() => {
    process.env.API_VERSION = '2';
    process.env.MOBILE_VERSION = ['1.2.0'];
  });
  afterEach(() => {
    process.env.API_VERSION = '';
    process.env.MOBILE_VERSION = '';
  });

  it('should return true if lower version in mobile (old version)', async () => {
    const result = await VersionHelper.shouldUpdate({ apiVersion: '1' });
    expect(result).toBeTruthy();
  });

  it('should return false if same version (old version)', async () => {
    const result = await VersionHelper.shouldUpdate({ apiVersion: '2' });
    expect(result).toBeFalsy();
  });

  it('should return false if greater version in mobile (old version)', async () => {
    const result = await VersionHelper.shouldUpdate({ apiVersion: '3' });
    expect(result).toBeFalsy();
  });

  it('should return true if lower version in mobile (new version)', async () => {
    const result = await VersionHelper.shouldUpdate({ mobileVersion: '1.1.0' });
    expect(result).toBeTruthy();
  });

  it('should return false if same version (new version)', async () => {
    const result = await VersionHelper.shouldUpdate({ mobileVersion: '1.2.0' });
    expect(result).toBeFalsy();
  });
});
