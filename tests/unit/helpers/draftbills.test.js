const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');

const Surcharge = require('../../../models/Surcharge');
const ThirdPartyPayer = require('../../../models/ThirdPartyPayer');
const FundingHistory = require('../../../models/FundingHistory');
const { populateSurcharge, populateFundings } = require('../../../helpers/draftBills');

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

describe('getMatchingFunding', () => {});

describe('computeCustomSurcharge', () => {});

describe('applySurcharge', () => {});

describe('getExclTaxes', () => {});

describe('getInclTaxes', () => {});
