const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');

const Surcharge = require('../../../models/Surcharge');
const ThirdPartyPayer = require('../../../models/ThirdPartyPayer');
const FundingHistory = require('../../../models/FundingHistory');
const {
  populateSurcharge,
  populateFundings,
  getMatchingFunding,
  computeCustomSurcharge,
} = require('../../../helpers/draftBills');

describe('populateSurcharge', () => {
  it('should populate surcharge and order versions', async () => {
    const surchargeId = new ObjectID();
    const returnedSurcharge = { _id: surchargeId, sundaySurcharge: 10 };
    const subscription = {
      _id: 'abc',
      versions: [
        { unitTTCRate: 13, startDate: new Date('2019-01-20'), _id: 5 },
        { unitTTCRate: 15, startDate: new Date('2019-02-24'), _id: 4 }
      ],
      service: {
        versions: [
          { startDate: new Date('2019-02-24'), _id: 1 },
          { surcharge: surchargeId, startDate: new Date('2019-03-20'), _id: 2 },
          { surcharge: surchargeId, startDate: new Date('2019-02-29'), _id: 3 },
        ],
      },
    };
    const findOne = sinon.stub(Surcharge, 'findOne').returns(returnedSurcharge);

    const result = await populateSurcharge(subscription);
    findOne.restore();

    expect(result).toBeDefined();
    expect(result._id).toEqual('abc');
    expect(result.versions.length).toEqual(2);
    expect(result.versions[0]._id).toEqual(4);
    expect(result.service.versions.length).toEqual(3);
    expect(result.service.versions[0]._id).toEqual(2);
    sinon.assert.callCount(findOne, 2);
  });
});

describe('populateFundings', () => {
  it('should return empty array if input empty', async () => {
    const result = await populateFundings([], new Date());
    expect(result).toEqual([]);
  });

  it('should populate third party payer funding', async () => {
    const tppId = new ObjectID();
    const fundings = [{ thirdPartyPayer: tppId, _id: 1, versions: [] }];
    const returnedTpp = { _id: tppId };
    const findOne = sinon.stub(ThirdPartyPayer, 'findOne').returns({ lean: () => returnedTpp });

    const result = await populateFundings(fundings, new Date());
    findOne.restore();

    expect(result).toBeDefined();
    expect(result[0].thirdPartyPayer).toBeDefined();
    expect(result[0].thirdPartyPayer._id).toEqual(tppId);
    sinon.assert.callCount(findOne, 1);
  });

  it('should populate funding history with once frequency and history', async () => {
    const versionId = new ObjectID();
    const fundings = [
      { versions: [{ frequency: 'once', _id: versionId }] },
    ];
    const returnedHistory = { careHours: 4, fundingVersion: versionId };
    const findOneTpp = sinon.stub(ThirdPartyPayer, 'findOne').returns({ lean: () => null });
    const findOne = sinon.stub(FundingHistory, 'findOne').returns({ lean: () => returnedHistory });

    const result = await populateFundings(fundings, new Date());
    findOneTpp.restore();
    findOne.restore();

    expect(result).toBeDefined();
    expect(result[0].versions[0].history).toBeDefined();
    expect(result[0].versions[0].history).toMatchObject({ careHours: 4, fundingVersion: versionId });
  });

  it('should populate funding history with once frequency and without history', async () => {
    const versionId = new ObjectID();
    const fundings = [
      { versions: [{ frequency: 'once', _id: versionId }] },
    ];
    const findOneTpp = sinon.stub(ThirdPartyPayer, 'findOne').returns({ lean: () => null });
    const findOne = sinon.stub(FundingHistory, 'findOne').returns({ lean: () => null });

    const result = await populateFundings(fundings, new Date());
    findOneTpp.restore();
    findOne.restore();

    expect(result).toBeDefined();
    expect(result[0].versions[0].history).toBeDefined();
    expect(result[0].versions[0].history).toMatchObject({ careHours: 0, amountTTC: 0, fundingVersion: versionId });
  });

  it('should populate funding history with monthly frequency', async () => {
    const versionId = new ObjectID();
    const fundings = [
      { versions: [{ frequency: 'monthly', _id: versionId }] },
    ];
    const returnedHistories = [
      { careHours: 3, fundingVersion: versionId, month: '01/2019' },
      { careHours: 5, fundingVersion: versionId, month: '02/2019' },
    ];
    const findOneTpp = sinon.stub(ThirdPartyPayer, 'findOne').returns({ lean: () => null });
    const find = sinon.stub(FundingHistory, 'find').returns(returnedHistories);

    const result = await populateFundings(fundings, new Date('2019/03/10'));
    findOneTpp.restore();
    find.restore();

    expect(result).toBeDefined();
    expect(result[0].versions[0].history).toBeDefined();
    expect(result[0].versions[0].history.length).toEqual(3);
    const addedHistory = result[0].versions[0].history.find(hist => hist.month === '03/2019');
    expect(addedHistory).toBeDefined();
    expect(addedHistory).toMatchObject({ careHours: 0, amountTTC: 0, fundingVersion: versionId, month: '03/2019' });
  });
});

describe('getMatchingFunding', () => {
  it('should return null if fundings is empty', () => {
    expect(getMatchingFunding(new Date(), [])).toBeNull();
  });

  it('should return matching version with random day', () => {
    const fundings = [
      {
        versions: [
          { _id: 1, careDays: [0, 2, 3], startDate: new Date('2019/03/23') },
          { _id: 3, careDays: [0, 3], startDate: new Date('2019/02/23') }
        ],
      },
      { versions: [{ _id: 2, careDays: [1, 5, 6], startDate: new Date('2019/04/23') }] },
    ];
    const result = getMatchingFunding(new Date('2019/04/23'), fundings);
    expect(result).toBeDefined();
    expect(result.versionId).toEqual(2);
  });

  it('should return matching version with holidays', () => {
    const fundings = [
      {
        versions: [{ _id: 1, careDays: [0, 2, 3], startDate: new Date('2019/03/23') }],
      },
      { versions: [{ _id: 3, careDays: [4, 7], startDate: new Date('2019/04/23') }] },
    ];
    const result = getMatchingFunding(new Date('2019/05/01'), fundings);
    expect(result).toBeDefined();
    expect(result.versionId).toEqual(3);
  });

  it('should return null if no matching version', () => {
    const fundings = [
      {
        versions: [
          { _id: 1, careDays: [0, 2, 3], startDate: new Date('2019/03/23') },
        ],
      },
      { versions: [{ _id: 2, careDays: [5, 6], startDate: new Date('2019/04/23') }] },
    ];
    const result = getMatchingFunding(new Date('2019/04/23'), fundings);
    expect(result).toBeNull();
  });
});

describe('computeCustomSurcharge', () => {
  const price = 12;
  const start = '09:00';
  const end = '12:00';
  const surcharge = 20;

  it('case 1 : dates included between start and end', () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(9),
      endDate: (new Date('2019/03/12')).setHours(11),
    };
    expect(Number.parseFloat(computeCustomSurcharge(event, start, end, surcharge, price).toFixed(1))).toEqual(14.4);
  });

  it('case 2 : startDate included between start and end and endDate after end', () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(8),
      endDate: (new Date('2019/03/12')).setHours(10),
    };
    expect(Number.parseFloat(computeCustomSurcharge(event, start, end, surcharge, price).toFixed(1))).toEqual(13.2);
  });

  it('case 3 : startDate before start and endDate included between start and end', () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(10),
      endDate: (new Date('2019/03/12')).setHours(13),
    };
    expect(Number.parseFloat(computeCustomSurcharge(event, start, end, surcharge, price).toFixed(1))).toEqual(13.6);
  });

  it('case 4 : startDate before start and endDate after endDate', () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(7),
      endDate: (new Date('2019/03/12')).setHours(13),
    };
    expect(Number.parseFloat(computeCustomSurcharge(event, start, end, surcharge, price).toFixed(1))).toEqual(13.2);
  });
});

describe('applySurcharge', () => {});

describe('getExclTaxes', () => {});

describe('getInclTaxes', () => {});
