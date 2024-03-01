const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const sinon = require('sinon');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');
const StatsHelper = require('../../../src/helpers/stats');
const SectorHistoryRepository = require('../../../src/repositories/SectorHistoryRepository');
const StatRepository = require('../../../src/repositories/StatRepository');
const CompanyRepository = require('../../../src/repositories/CompanyRepository');

describe('getCustomerFollowUp', () => {
  let getCustomerFollowUpStub;
  beforeEach(() => {
    getCustomerFollowUpStub = sinon.stub(CompanyRepository, 'getCustomerFollowUp');
  });
  afterEach(() => {
    getCustomerFollowUpStub.restore();
  });

  it('should get customer follow up ', async () => {
    const customerId = new ObjectId();
    const credentials = { company: { _id: new ObjectId() } };

    const customerFollowUp = {
      followUp: [
        {
          _id: new ObjectId(),
          contracts: [{ _id: new ObjectId() }],
          inactivityDate: null,
          identity: { firstname: 'Auxiliary', lastname: 'White' },
          role: { client: { name: 'auxiliary' } },
          createdAt: new Date(),
          lastEvent: { startDate: new Date() },
          totalHours: 5,
          sector: { name: 'Neptune' },
        },
      ],
    };

    getCustomerFollowUpStub.returns(customerFollowUp);

    const result = await StatsHelper.getCustomerFollowUp(customerId, credentials);
    expect(result).toEqual(customerFollowUp);
    sinon.assert.calledWithExactly(getCustomerFollowUpStub, customerId, credentials);
  });
});

describe('getCustomerFundingsMonitoring', () => {
  const fundingsDate = {
    maxStartDate: CompaniDate().endOf('month').toISO(),
    minEndDate: CompaniDate().startOf('month').toISO(),
  };
  const eventsDate = {
    minDate: CompaniDate().oldSubtract({ months: 1 }).startOf('month').toISO(),
    maxDate: CompaniDate().endOf('month').toISO(),
  };

  let getEventsGroupedByFundingsStub;
  beforeEach(() => {
    getEventsGroupedByFundingsStub = sinon.stub(StatRepository, 'getEventsGroupedByFundings');
  });

  afterEach(() => {
    getEventsGroupedByFundingsStub.restore();
  });

  it('should return empty array if no fundings', async () => {
    const customerId = new ObjectId();
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    getEventsGroupedByFundingsStub.returns([]);
    const fundingsMonitoring = await StatsHelper.getCustomerFundingsMonitoring(customerId, credentials);
    expect(fundingsMonitoring).toEqual([]);
    sinon.assert.calledWithExactly(
      getEventsGroupedByFundingsStub,
      customerId,
      fundingsDate,
      eventsDate,
      companyId
    );
  });

  it('should return info if no events', async () => {
    const customerId = new ObjectId();
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    getEventsGroupedByFundingsStub.returns([{
      thirdPartyPayer: { name: 'Tiers payeur' },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: CompaniDate().startOf('month').oldSubtract({ months: 1 }),
      careHours: 5,
      createdAt: '2019-10-01T14:06:16.089Z',
      prevMonthEvents: [],
      currentMonthEvents: [],
    }]);
    const fundingsMonitoring = await StatsHelper.getCustomerFundingsMonitoring(customerId, credentials);

    expect(fundingsMonitoring).toEqual([{
      thirdPartyPayer: 'Tiers payeur',
      currentMonthCareHours: 0,
      careHours: 5,
      prevMonthCareHours: 0,
    }]);
    sinon.assert.calledWithExactly(
      getEventsGroupedByFundingsStub,
      customerId,
      fundingsDate,
      eventsDate,
      companyId
    );
  });

  it('should return stats on care hours', async () => {
    const eventsGroupedByFundings = [{
      thirdPartyPayer: { name: 'Tiers payeur' },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: CompaniDate().startOf('month').oldSubtract({ months: 1 }),
      careHours: 5,
      createdAt: '2019-10-01T14:06:16.089Z',
      currentMonthEvents: [
        {
          startDate: CompaniDate().startOf('month').oldAdd({ hours: 14 }),
          endDate: CompaniDate().startOf('month').oldAdd({ hours: 16 }),
        },
        {
          startDate: CompaniDate().startOf('month').oldAdd({ days: 1, hours: 11 }),
          endDate: CompaniDate().startOf('month').oldAdd({ days: 1, hours: 15 }),
        },
      ],
      prevMonthEvents: [
        {
          type: 'intervention',
          startDate: CompaniDate().startOf('month').oldSubtract({ months: 1 }).oldAdd({ hours: 10 }),
          endDate: CompaniDate().startOf('month').oldSubtract({ months: 1 }).oldAdd({ hours: 12 }),
        },
        {
          type: 'intervention',
          startDate: CompaniDate().startOf('month').oldSubtract({ months: 1 }).oldAdd({ days: 1, hours: 9 }),
          endDate: CompaniDate()
            .startOf('month')
            .oldSubtract({ months: 1 })
            .oldAdd({ days: 1, hours: 10, minutes: 30 }),
        },
      ],
    }];
    const customerId = new ObjectId();
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    getEventsGroupedByFundingsStub.returns(eventsGroupedByFundings);
    const fundingsMonitoring = await StatsHelper.getCustomerFundingsMonitoring(customerId, credentials);

    expect(fundingsMonitoring).toEqual([{
      thirdPartyPayer: 'Tiers payeur',
      currentMonthCareHours: 6,
      careHours: 5,
      prevMonthCareHours: 3.5,
    }]);
    sinon.assert.calledWithExactly(
      getEventsGroupedByFundingsStub,
      customerId,
      fundingsDate,
      eventsDate,
      companyId
    );
  });

  it('should return -1 for previous month if funding starts on current month', async () => {
    const eventsGroupedByFundings = [{
      thirdPartyPayer: { name: 'Tiers payeur' },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: CompaniDate().startOf('month').toISO(),
      careHours: 5,
      createdAt: '2019-10-01T14:06:16.089Z',
      currentMonthEvents: [
        {
          type: 'intervention',
          startDate: CompaniDate().startOf('month').oldAdd({ days: 2, hours: 14 }).toISO(),
          endDate: CompaniDate().startOf('month').oldAdd({ days: 2, hours: 16 }).toISO(),
        },
        {
          type: 'intervention',
          startDate: CompaniDate().startOf('month').oldAdd({ hours: 11 }).toISO(),
          endDate: CompaniDate().startOf('month').oldAdd({ hours: 15 }).toISO(),
        },
      ],
      prevMonthEvents: [
        {
          type: 'intervention',
          startDate: CompaniDate().oldSubtract({ months: 1 }).oldAdd({ hours: 10 }).toISO(),
          endDate: CompaniDate().oldSubtract({ months: 1 }).oldAdd({ hours: 12 }).toISO(),
        },
        {
          type: 'intervention',
          startDate: CompaniDate().oldSubtract({ months: 1 }).startOf('month').oldAdd({ hours: 10 })
            .toISO(),
          endDate: CompaniDate().oldSubtract({ months: 1 }).startOf('month').oldAdd({ hours: 12 })
            .toISO(),
        },
      ],
    }];
    const customerId = new ObjectId();
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    getEventsGroupedByFundingsStub.returns(eventsGroupedByFundings);
    const fundingsMonitoring = await StatsHelper.getCustomerFundingsMonitoring(customerId, credentials);

    expect(fundingsMonitoring).toEqual([{
      thirdPartyPayer: 'Tiers payeur',
      currentMonthCareHours: 6,
      careHours: 5,
      prevMonthCareHours: -1,
    }]);
    sinon.assert.calledWithExactly(
      getEventsGroupedByFundingsStub,
      customerId,
      fundingsDate,
      eventsDate,
      companyId
    );
  });
});

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
