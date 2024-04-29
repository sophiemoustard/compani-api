const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const sinon = require('sinon');
const StatsHelper = require('../../../src/helpers/stats');
const SectorHistoryRepository = require('../../../src/repositories/SectorHistoryRepository');

describe('getPaidInterventionStats', () => {
  let getPaidInterventionStats;
  let getUsersFromSectorHistoriesStub;
  const credentials = { company: { _id: new ObjectId() } };
  beforeEach(() => {
    getPaidInterventionStats = sinon.stub(SectorHistoryRepository, 'getPaidInterventionStats');
    getUsersFromSectorHistoriesStub = sinon.stub(SectorHistoryRepository, 'getUsersFromSectorHistories');
  });
  afterEach(() => {
    getPaidInterventionStats.restore();
    getUsersFromSectorHistoriesStub.restore();
  });

  it('Case sector : should format sector as array', async () => {
    const query = { sector: new ObjectId(), month: '10-2019' };
    const auxiliaries = [{ auxiliaryId: new ObjectId() }];
    getUsersFromSectorHistoriesStub.returns(auxiliaries);
    const getPaidInterventionStatsResult = [{
      auxiliary: auxiliaries[0]._id,
      customerCount: 9,
      sectors: ['12345'],
    }];
    getPaidInterventionStats.returns(getPaidInterventionStatsResult);
    const startOfMonth = '2019-09-30T22:00:00.000Z';
    const endOfMonth = '2019-10-31T22:59:59.999Z';

    const result = await StatsHelper.getPaidInterventionStats(query, credentials);

    expect(result).toEqual(getPaidInterventionStatsResult);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startOfMonth,
      endOfMonth,
      [new ObjectId(query.sector)],
      credentials.company._id
    );
    sinon.assert.calledWithExactly(
      getPaidInterventionStats,
      auxiliaries.map(aux => aux.auxiliaryId),
      query.month,
      credentials.company._id
    );
  });

  it('Case sector : should format array sector with objectId', async () => {
    const query = { sector: [new ObjectId(), new ObjectId()], month: '10-2019' };
    const auxiliaries = [{ auxiliaryId: new ObjectId() }, { auxiliaryId: new ObjectId() }];
    const startOfMonth = '2019-09-30T22:00:00.000Z';
    const endOfMonth = '2019-10-31T22:59:59.999Z';

    getUsersFromSectorHistoriesStub.returns(auxiliaries);
    const getPaidInterventionStatsResult = [
      { auxiliary: auxiliaries[0]._id, customerCount: 9, sectors: [['12345']] },
      { auxiliary: auxiliaries[1]._id, customerCount: 11, sectors: [['12345']] },
    ];
    getPaidInterventionStats.returns(getPaidInterventionStatsResult);

    const result = await StatsHelper.getPaidInterventionStats(query, credentials);

    expect(result).toEqual(getPaidInterventionStatsResult);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startOfMonth,
      endOfMonth,
      [new ObjectId(query.sector[0]), new ObjectId(query.sector[1])],
      credentials.company._id
    );
    sinon.assert.calledWithExactly(
      getPaidInterventionStats,
      auxiliaries.map(aux => aux.auxiliaryId),
      query.month,
      credentials.company._id
    );
  });

  it('Case auxiliary', async () => {
    const query = { auxiliary: new ObjectId(), month: '10-2019' };
    getPaidInterventionStats.returns({ customerCount: 9 });
    const result = await StatsHelper.getPaidInterventionStats(query, credentials);

    expect(result).toEqual({ customerCount: 9 });
    sinon.assert.calledWithExactly(
      getPaidInterventionStats,
      [query.auxiliary],
      '10-2019',
      credentials.company._id
    );
    sinon.assert.notCalled(getUsersFromSectorHistoriesStub);
  });
});
