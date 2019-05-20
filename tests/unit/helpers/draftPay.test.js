const expect = require('expect');
const DraftPayHelper = require('../../../helpers/draftPay');

describe('getContractHours', () => {
  it('Case 1. One version no sunday', () => {
    const contract = {
      versions: [
        { isActive: false, startDate: '2019-01-01T00:00:00.000Z', endDate: '2019-05-04T00:00:00.000Z', weeklyHours: 18 },
        { isActive: true, endDate: '', startDate: '2019-05-04T00:00:00.000Z', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-05-06T00:00:00.000Z', endDate: '2019-05-10T00:00:00.000Z' };

    const result = DraftPayHelper.getContractHours(contract, query);

    expect(result).toBeDefined();
    expect(result).toBe(20);
  });

  it('Case 2. One version and sunday included', () => {
    const contract = {
      versions: [
        { isActive: false, startDate: '2019-01-01T00:00:00.000Z', endDate: '2019-05-04T00:00:00.000Z', weeklyHours: 18 },
        { isActive: true, endDate: '', startDate: '2019-05-04T00:00:00.000Z', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-05-04T00:00:00.000Z', endDate: '2019-05-10T00:00:00.000Z' };

    const result = DraftPayHelper.getContractHours(contract, query);

    expect(result).toBeDefined();
    expect(result).toBe(24);
  });

  it('Case 3. Multiple versions', () => {
    const contract = {
      versions: [
        { isActive: false, startDate: '2019-01-01T00:00:00.000Z', endDate: '2019-05-04T00:00:00.000Z', weeklyHours: 18 },
        { isActive: true, endDate: '', startDate: '2019-05-04T00:00:00.000Z', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-05-01T00:00:00.000Z', endDate: '2019-05-10T00:00:00.000Z' };

    const result = DraftPayHelper.getContractHours(contract, query);

    expect(result).toBeDefined();
    expect(result).toBe(33);
  });
});
