const { expect } = require('expect');
const VersionHelper = require('../../../src/helpers/version');

describe('shouldUpdate', () => {
  beforeEach(() => {
    process.env.API_VERSION = '2';
    process.env.FORMATION_MOBILE_VERSION = ['1.2.0'];
    process.env.ERP_MOBILE_VERSION = ['1.8.0'];
  });
  afterEach(() => {
    process.env.API_VERSION = '';
    process.env.FORMATION_MOBILE_VERSION = '';
    process.env.ERP_MOBILE_VERSION = '';
  });

  it('should return true if api version', async () => {
    const result = await VersionHelper.shouldUpdate({ apiVersion: '1' });
    expect(result).toBeTruthy();
  });

  it('should return false if in maintained version and no appName - app formation (new version)', async () => {
    const result = await VersionHelper.shouldUpdate({ mobileVersion: '1.2.0' });
    expect(result).toBeFalsy();
  });

  it('should return true if version not in maintained versions - app formation (new version)', async () => {
    const result = await VersionHelper.shouldUpdate({ mobileVersion: '1.1.0', appName: 'formation' });
    expect(result).toBeTruthy();
  });

  it('should return false if in maintained version - app formation (new version)', async () => {
    const result = await VersionHelper.shouldUpdate({ mobileVersion: '1.2.0', appName: 'formation' });
    expect(result).toBeFalsy();
  });

  it('should return true if version not in maintained versions - app erp (new version)', async () => {
    const result = await VersionHelper.shouldUpdate({ mobileVersion: '1.2.0', appName: 'erp' });
    expect(result).toBeTruthy();
  });

  it('should return false if in maintained version - app erp (new version)', async () => {
    const result = await VersionHelper.shouldUpdate({ mobileVersion: '1.8.0', appName: 'erp' });
    expect(result).toBeFalsy();
  });
});
