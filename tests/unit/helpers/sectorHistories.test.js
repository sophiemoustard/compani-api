const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const SinonMongoose = require('../sinonMongoose');
const SectorHistory = require('../../../src/models/SectorHistory');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');

describe('getAuxiliarySectors', () => {
  let sectorHistoryFind;
  beforeEach(() => {
    sectorHistoryFind = sinon.stub(SectorHistory, 'find');
  });

  afterEach(() => {
    sectorHistoryFind.restore();
  });

  it('should return auxiliary sectors on a time range', async () => {
    const auxiliaryId = new ObjectId();
    const companyId = new ObjectId();
    const sectorId1 = new ObjectId();
    const sectorId2 = new ObjectId();
    sectorHistoryFind.returns(SinonMongoose.stubChainedQueries(
      [{ sector: sectorId1 }, { sector: sectorId1 }, { sector: sectorId2 }],
      ['lean']
    ));

    const result = await SectorHistoryHelper.getAuxiliarySectors(auxiliaryId, companyId, '2020-01-01', '2020-02-01');

    expect(result).toEqual([sectorId1.toHexString(), sectorId2.toHexString()]);
    SinonMongoose.calledOnceWithExactly(
      sectorHistoryFind,
      [
        {
          query: 'find',
          args: [
            {
              company: companyId,
              auxiliary: auxiliaryId,
              startDate: { $lt: '2020-02-01' },
              $or: [{ endDate: { $gt: '2020-01-01' } }, { endDate: { $exists: false } }],
            },
            { sector: 1 },
          ],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should return an empty array if no sector on the time range', async () => {
    const auxiliaryId = new ObjectId();
    const companyId = new ObjectId();
    sectorHistoryFind.returns(SinonMongoose.stubChainedQueries([], ['lean']));

    const result = await SectorHistoryHelper.getAuxiliarySectors(auxiliaryId, companyId, '2020-01-01', '2020-02-02');

    expect(result).toEqual([]);
  });
});
