const expect = require('expect');
const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const moment = require('../../../src/extensions/moment');
const StatsHelper = require('../../../src/helpers/stats');
const SectorHistoryRepository = require('../../../src/repositories/SectorHistoryRepository');
const StatRepository = require('../../../src/repositories/StatRepository');

require('sinon-mongoose');

describe('getCustomerFundingsMonitoring', () => {
  const fundingsDate = {
    maxStartDate: moment().endOf('month').toDate(),
    minEndDate: moment().startOf('month').toDate(),
  };
  const eventsDate = {
    minDate: moment().subtract(1, 'month').startOf('month').toDate(),
    maxDate: moment().endOf('month').toDate(),
  };

  let getEventsGroupedByFundingsStub;
  beforeEach(() => {
    getEventsGroupedByFundingsStub = sinon.stub(StatRepository, 'getEventsGroupedByFundings');
  });

  afterEach(() => {
    getEventsGroupedByFundingsStub.restore();
  });

  it('should return empty array if no fundings', async () => {
    const customerId = new ObjectID();
    const companyId = new ObjectID();
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
    const customerId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    getEventsGroupedByFundingsStub.returns([{
      thirdPartyPayer: { name: 'Tiers payeur' },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: moment().startOf('month').subtract(1, 'month'),
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
      startDate: moment().startOf('month').subtract(1, 'month'),
      careHours: 5,
      createdAt: '2019-10-01T14:06:16.089Z',
      currentMonthEvents: [
        {
          startDate: moment().startOf('month').hours(14),
          endDate: moment().startOf('month').hours(16),
        },
        {
          startDate: moment().startOf('month').add(1, 'd').hours(11),
          endDate: moment().startOf('month').add(1, 'd').hours(15),
        },
      ],
      prevMonthEvents: [
        {
          type: 'intervention',
          startDate: moment().startOf('month').subtract(1, 'month').hours(10),
          endDate: moment().startOf('month').subtract(1, 'month').hours(12),
        },
        {
          type: 'intervention',
          startDate: moment()
            .startOf('month')
            .subtract(1, 'month')
            .add(1, 'd')
            .hours(9),
          endDate: moment()
            .startOf('month')
            .subtract(1, 'month')
            .add(1, 'd')
            .hours(10)
            .minutes(30),
        },
      ],
    }];
    const customerId = new ObjectID();
    const companyId = new ObjectID();
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
      startDate: moment().startOf('month').toDate(),
      careHours: 5,
      createdAt: '2019-10-01T14:06:16.089Z',
      currentMonthEvents: [
        {
          type: 'intervention',
          startDate: moment()
            .startOf('month')
            .add(2, 'd')
            .hours(14)
            .toDate(),
          endDate: moment()
            .startOf('month')
            .add(2, 'd')
            .hours(16)
            .toDate(),
        },
        {
          type: 'intervention',
          startDate: moment().startOf('month').hours(11).toDate(),
          endDate: moment().startOf('month').hours(15).toDate(),
        },
      ],
      prevMonthEvents: [
        {
          type: 'intervention',
          startDate: moment().subtract(1, 'M').hours(10).toDate(),
          endDate: moment().subtract(1, 'M').hours(12).toDate(),
        },
        {
          type: 'intervention',
          startDate: moment()
            .subtract(1, 'M')
            .startOf('month')
            .hours(10)
            .toDate(),
          endDate: moment()
            .subtract(1, 'M')
            .startOf('month')
            .hours(12)
            .toDate(),
        },
      ],
    }];
    const customerId = new ObjectID();
    const companyId = new ObjectID();
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

describe('getAllCustomersFundingsMonitoring', () => {
  const fundingsDate = {
    maxStartDate: moment().endOf('month').toDate(),
    minEndDate: moment().startOf('month').toDate(),
  };
  const eventsDate = {
    minDate: moment().subtract(1, 'month').startOf('month').toDate(),
    maxDate: moment().add(1, 'month').endOf('month').toDate(),
  };
  const companyId = new ObjectID();
  const credentials = { company: { _id: companyId } };

  let getEventsGroupedByFundingsforAllCustomersStub;
  beforeEach(() => {
    getEventsGroupedByFundingsforAllCustomersStub =
      sinon.stub(StatRepository, 'getEventsGroupedByFundingsforAllCustomers');
  });

  afterEach(() => {
    getEventsGroupedByFundingsforAllCustomersStub.restore();
  });

  it('should return empty array if no fundings', async () => {
    getEventsGroupedByFundingsforAllCustomersStub.returns([]);
    const allCustomersFundingsMonitoring = await StatsHelper.getAllCustomersFundingsMonitoring(credentials);
    expect(allCustomersFundingsMonitoring).toEqual([]);
    sinon.assert.calledWithExactly(
      getEventsGroupedByFundingsforAllCustomersStub,
      fundingsDate,
      eventsDate,
      companyId
    );
  });

  it('should return info if no events', async () => {
    const tppId = new ObjectID();
    const sectorId = new ObjectID();
    getEventsGroupedByFundingsforAllCustomersStub.returns([{
      thirdPartyPayer: { name: 'Tiers payeur', _id: tppId },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: moment().startOf('month').subtract(1, 'month'),
      careHours: 5,
      unitTTCRate: 12,
      customerParticipationRate: 10,
      createdAt: '2019-10-01T14:06:16.089Z',
      prevMonthEvents: [],
      currentMonthEvents: [],
      nextMonthEvents: [],
      customer: { firstname: 'toto', lastname: 'test' },
      referent: { firstname: 'referent', lastname: 'test' },
      sector: { name: 'equipe', _id: sectorId },
    }]);
    const fundingsMonitoring = await StatsHelper.getAllCustomersFundingsMonitoring(credentials);

    expect(fundingsMonitoring).toEqual([{
      tpp: { name: 'Tiers payeur', _id: tppId },
      currentMonthCareHours: 0,
      careHours: 5,
      prevMonthCareHours: 0,
      nextMonthCareHours: 0,
      unitTTCRate: 12,
      customerParticipationRate: 10,
      sector: { name: 'equipe', _id: sectorId },
      customer: { firstname: 'toto', lastname: 'test' },
      referent: { firstname: 'referent', lastname: 'test' },
    }]);
    sinon.assert.calledWithExactly(
      getEventsGroupedByFundingsforAllCustomersStub,
      fundingsDate,
      eventsDate,
      companyId
    );
  });

  it('should return stats on care hours', async () => {
    const tppId = new ObjectID();
    const sectorId = new ObjectID();
    const eventsGroupedByFundings = [{
      thirdPartyPayer: { name: 'Tiers payeur', _id: tppId },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: moment().startOf('month').subtract(1, 'month'),
      careHours: 5,
      createdAt: '2019-10-01T14:06:16.089Z',
      unitTTCRate: 12,
      customerParticipationRate: 10,
      customer: { firstname: 'toto', lastname: 'test' },
      referent: { firstname: 'referent', lastname: 'test' },
      sector: { name: 'equipe', _id: sectorId },
      currentMonthEvents: [
        {
          startDate: moment().startOf('month').hours(14),
          endDate: moment().startOf('month').hours(16),
        },
        {
          startDate: moment().startOf('month').add(1, 'd').hours(11),
          endDate: moment().startOf('month').add(1, 'd').hours(15),
        },
      ],
      prevMonthEvents: [
        {
          type: 'intervention',
          startDate: moment().startOf('month').subtract(1, 'month').hours(10),
          endDate: moment().startOf('month').subtract(1, 'month').hours(12),
        },
        {
          type: 'intervention',
          startDate: moment()
            .startOf('month')
            .subtract(1, 'month')
            .add(1, 'd')
            .hours(9),
          endDate: moment()
            .startOf('month')
            .subtract(1, 'month')
            .add(1, 'd')
            .hours(10)
            .minutes(30),
        },
      ],
      nextMonthEvents: [
        {
          type: 'intervention',
          startDate: moment().startOf('month').add(1, 'month').hours(8),
          endDate: moment().startOf('month').add(1, 'month').hours(10),
        },
        {
          type: 'intervention',
          startDate: moment()
            .startOf('month')
            .add(1, 'month')
            .add(1, 'd')
            .hours(9),
          endDate: moment()
            .startOf('month')
            .add(1, 'month')
            .add(1, 'd')
            .hours(10),
        },
      ],
    }];

    getEventsGroupedByFundingsforAllCustomersStub.returns(eventsGroupedByFundings);
    const fundingsMonitoring = await StatsHelper.getAllCustomersFundingsMonitoring(credentials);

    expect(fundingsMonitoring).toEqual([{
      tpp: { name: 'Tiers payeur', _id: tppId },
      currentMonthCareHours: 6,
      careHours: 5,
      prevMonthCareHours: 3.5,
      nextMonthCareHours: 3,
      unitTTCRate: 12,
      customerParticipationRate: 10,
      sector: { name: 'equipe', _id: sectorId },
      customer: { firstname: 'toto', lastname: 'test' },
      referent: { firstname: 'referent', lastname: 'test' },
    }]);
    sinon.assert.calledWithExactly(
      getEventsGroupedByFundingsforAllCustomersStub,
      fundingsDate,
      eventsDate,
      companyId
    );
  });

  it('should return -1 for previous month if funding starts on current month', async () => {
    const tppId = new ObjectID();
    const sectorId = new ObjectID();
    const eventsGroupedByFundings = [{
      unitTTCRate: 12,
      customerParticipationRate: 10,
      thirdPartyPayer: { name: 'Tiers payeur', _id: tppId },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: moment().startOf('month'),
      careHours: 5,
      createdAt: '2019-10-01T14:06:16.089Z',
      customer: { firstname: 'toto', lastname: 'test' },
      referent: { firstname: 'referent', lastname: 'test' },
      sector: { name: 'equipe', _id: sectorId },
      currentMonthEvents: [
        {
          startDate: moment().startOf('month').hours(14),
          endDate: moment().startOf('month').hours(16),
        },
        {
          startDate: moment().startOf('month').add(1, 'd').hours(11),
          endDate: moment().startOf('month').add(1, 'd').hours(15),
        },
      ],
      prevMonthEvents: [
        {
          type: 'intervention',
          startDate: moment().startOf('month').subtract(1, 'month').hours(10),
          endDate: moment().startOf('month').subtract(1, 'month').hours(12),
        },
        {
          type: 'intervention',
          startDate: moment()
            .startOf('month')
            .subtract(1, 'month')
            .add(1, 'd')
            .hours(9),
          endDate: moment()
            .startOf('month')
            .subtract(1, 'month')
            .add(1, 'd')
            .hours(10)
            .minutes(30),
        },
      ],
      nextMonthEvents: [
        {
          type: 'intervention',
          startDate: moment().startOf('month').add(1, 'month').hours(8),
          endDate: moment().startOf('month').add(1, 'month').hours(10),
        },
        {
          type: 'intervention',
          startDate: moment()
            .startOf('month')
            .add(1, 'month')
            .add(1, 'd')
            .hours(9),
          endDate: moment()
            .startOf('month')
            .add(1, 'month')
            .add(1, 'd')
            .hours(10),
        },
      ],
    }];

    getEventsGroupedByFundingsforAllCustomersStub.returns(eventsGroupedByFundings);
    const fundingsMonitoring = await StatsHelper.getAllCustomersFundingsMonitoring(credentials);

    expect(fundingsMonitoring).toEqual([{
      tpp: { name: 'Tiers payeur', _id: tppId },
      currentMonthCareHours: 6,
      careHours: 5,
      prevMonthCareHours: -1,
      nextMonthCareHours: 3,
      unitTTCRate: 12,
      customerParticipationRate: 10,
      sector: { name: 'equipe', _id: sectorId },
      customer: { firstname: 'toto', lastname: 'test' },
      referent: { firstname: 'referent', lastname: 'test' },
    }]);
    sinon.assert.calledWithExactly(
      getEventsGroupedByFundingsforAllCustomersStub,
      fundingsDate,
      eventsDate,
      companyId
    );
  });

  it('should return -1 for next month if funding ends on current month', async () => {
    const tppId = new ObjectID();
    const sectorId = new ObjectID();
    const eventsGroupedByFundings = [{
      thirdPartyPayer: { name: 'Tiers payeur', _id: tppId },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: '2019-11-01',
      endDate: moment().endOf('month'),
      careHours: 5,
      unitTTCRate: 12,
      customerParticipationRate: 10,
      customer: { firstname: 'toto', lastname: 'test' },
      referent: { firstname: 'referent', lastname: 'test' },
      sector: { name: 'equipe', _id: sectorId },
      createdAt: '2019-10-01T14:06:16.089Z',
      currentMonthEvents: [
        {
          startDate: moment().startOf('month').hours(14),
          endDate: moment().startOf('month').hours(16),
        },
        {
          startDate: moment().startOf('month').add(1, 'd').hours(11),
          endDate: moment().startOf('month').add(1, 'd').hours(15),
        },
      ],
      prevMonthEvents: [
        {
          type: 'intervention',
          startDate: moment().startOf('month').subtract(1, 'month').hours(10),
          endDate: moment().startOf('month').subtract(1, 'month').hours(12),
        },
        {
          type: 'intervention',
          startDate: moment()
            .startOf('month')
            .subtract(1, 'month')
            .add(1, 'd')
            .hours(9),
          endDate: moment()
            .startOf('month')
            .subtract(1, 'month')
            .add(1, 'd')
            .hours(10)
            .minutes(30),
        },
      ],
      nextMonthEvents: [
        {
          type: 'intervention',
          startDate: moment().startOf('month').add(1, 'month').hours(10),
          endDate: moment().startOf('month').add(1, 'month').hours(12),
        },
        {
          type: 'intervention',
          startDate: moment()
            .startOf('month')
            .add(1, 'month')
            .add(1, 'd')
            .hours(9),
          endDate: moment()
            .startOf('month')
            .add(1, 'month')
            .add(1, 'd')
            .hours(10)
            .minutes(30),
        },
      ],
    }];

    getEventsGroupedByFundingsforAllCustomersStub.returns(eventsGroupedByFundings);
    const fundingsMonitoring = await StatsHelper.getAllCustomersFundingsMonitoring(credentials);

    expect(fundingsMonitoring).toEqual([{
      tpp: { name: 'Tiers payeur', _id: tppId },
      currentMonthCareHours: 6,
      careHours: 5,
      nextMonthCareHours: -1,
      prevMonthCareHours: 3.5,
      unitTTCRate: 12,
      customerParticipationRate: 10,
      sector: { name: 'equipe', _id: sectorId },
      customer: { firstname: 'toto', lastname: 'test' },
      referent: { firstname: 'referent', lastname: 'test' },
    }]);
    sinon.assert.calledWithExactly(
      getEventsGroupedByFundingsforAllCustomersStub,
      fundingsDate,
      eventsDate,
      companyId
    );
  });
});

describe('getPaidInterventionStats', () => {
  let getPaidInterventionStats;
  let getUsersFromSectorHistoriesStub;
  const credentials = { company: { _id: new ObjectID() } };
  beforeEach(() => {
    getPaidInterventionStats = sinon.stub(SectorHistoryRepository, 'getPaidInterventionStats');
    getUsersFromSectorHistoriesStub = sinon.stub(SectorHistoryRepository, 'getUsersFromSectorHistories');
  });
  afterEach(() => {
    getPaidInterventionStats.restore();
    getUsersFromSectorHistoriesStub.restore();
  });

  it('Case sector : should format sector as array', async () => {
    const query = { sector: '5d1a40b7ecb0da251cfa4fe9', month: '102019' };
    const auxiliaries = [{ auxiliaryId: new ObjectID() }];
    getUsersFromSectorHistoriesStub.returns(auxiliaries);
    const getPaidInterventionStatsResult = [{
      auxiliary: auxiliaries[0]._id,
      customerCount: 9,
      sectors: ['12345'],
    }];
    getPaidInterventionStats.returns(getPaidInterventionStatsResult);
    const startOfMonth = moment(query.month, 'MMYYYY').startOf('M').toDate();
    const endOfMonth = moment(query.month, 'MMYYYY').endOf('M').toDate();

    const result = await StatsHelper.getPaidInterventionStats(query, credentials);

    expect(result).toEqual(getPaidInterventionStatsResult);
    sinon.assert.calledWithExactly(
      getUsersFromSectorHistoriesStub,
      startOfMonth,
      endOfMonth,
      [new ObjectID(query.sector)],
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
    const query = { sector: ['5d1a40b7ecb0da251cfa4fe9', '5d1a40b7ecb0da251cfa4fe8'], month: '102019' };
    const auxiliaries = [{ auxiliaryId: new ObjectID() }, { auxiliaryId: new ObjectID() }];
    const startOfMonth = moment(query.month, 'MMYYYY').startOf('M').toDate();
    const endOfMonth = moment(query.month, 'MMYYYY').endOf('M').toDate();

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
      [new ObjectID(query.sector[0]), new ObjectID(query.sector[1])],
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
    const query = { auxiliary: new ObjectID(), month: '102019' };
    getPaidInterventionStats.returns({ customerCount: 9 });
    const result = await StatsHelper.getPaidInterventionStats(query, credentials);

    expect(result).toEqual({ customerCount: 9 });
    sinon.assert.calledWithExactly(
      getPaidInterventionStats,
      [query.auxiliary],
      '102019',
      credentials.company._id
    );
    sinon.assert.notCalled(getUsersFromSectorHistoriesStub);
  });
});

describe('getCustomersAndDurationBySector', () => {
  let getCustomersAndDurationBySector;
  const credentials = { company: { _id: new ObjectID() } };
  beforeEach(() => {
    getCustomersAndDurationBySector = sinon.stub(StatRepository, 'getCustomersAndDurationBySector');
  });
  afterEach(() => {
    getCustomersAndDurationBySector.restore();
  });

  it('Case sector : should format sector as array', async () => {
    const query = { sector: '5d1a40b7ecb0da251cfa4fe9', month: '102019' };
    getCustomersAndDurationBySector.returns({ customerCount: 9 });
    const result = await StatsHelper.getCustomersAndDurationBySector(query, credentials);

    expect(result).toEqual({ customerCount: 9 });
    sinon.assert.calledWithExactly(
      getCustomersAndDurationBySector,
      [new ObjectID('5d1a40b7ecb0da251cfa4fe9')],
      '102019',
      credentials.company._id
    );
  });

  it('Case sector : should format array sector with objectId', async () => {
    const query = { sector: ['5d1a40b7ecb0da251cfa4fea', '5d1a40b7ecb0da251cfa4fe9'], month: '102019' };
    getCustomersAndDurationBySector.returns({ customerCount: 9 });
    const result = await StatsHelper.getCustomersAndDurationBySector(query, credentials);

    expect(result).toEqual({ customerCount: 9 });
    sinon.assert.calledWithExactly(
      getCustomersAndDurationBySector,
      [new ObjectID('5d1a40b7ecb0da251cfa4fea'), new ObjectID('5d1a40b7ecb0da251cfa4fe9')],
      '102019',
      credentials.company._id
    );
  });
});

describe('getIntenalAndBilledHoursBySector', () => {
  let getIntenalAndBilledHoursBySector;
  const credentials = { company: { _id: new ObjectID() } };
  beforeEach(() => {
    getIntenalAndBilledHoursBySector = sinon.stub(StatRepository, 'getIntenalAndBilledHoursBySector');
  });
  afterEach(() => {
    getIntenalAndBilledHoursBySector.restore();
  });

  it('Case sector : should format sector as array', async () => {
    const query = { sector: '5d1a40b7ecb0da251cfa4fe9', month: '102019' };
    getIntenalAndBilledHoursBySector.returns({ interventions: 9 });
    const result = await StatsHelper.getIntenalAndBilledHoursBySector(query, credentials);

    expect(result).toEqual({ interventions: 9 });
    sinon.assert.calledWithExactly(
      getIntenalAndBilledHoursBySector,
      [new ObjectID('5d1a40b7ecb0da251cfa4fe9')],
      '102019',
      credentials.company._id
    );
  });

  it('Case sector : should format array sector with objectId', async () => {
    const query = { sector: ['5d1a40b7ecb0da251cfa4fea', '5d1a40b7ecb0da251cfa4fe9'], month: '102019' };
    getIntenalAndBilledHoursBySector.returns({ interventions: 9 });
    const result = await StatsHelper.getIntenalAndBilledHoursBySector(query, credentials);

    expect(result).toEqual({ interventions: 9 });
    sinon.assert.calledWithExactly(
      getIntenalAndBilledHoursBySector,
      [new ObjectID('5d1a40b7ecb0da251cfa4fea'), new ObjectID('5d1a40b7ecb0da251cfa4fe9')],
      '102019',
      credentials.company._id
    );
  });
});
