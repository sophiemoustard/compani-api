const expect = require('expect');
const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const moment = require('../../../src/extensions/moment');
const StatsHelper = require('../../../src/helpers/stats');
const StatRepository = require('../../../src/repositories/StatRepository');

require('sinon-mongoose');

describe('getCustomerFundingsMonitoring', () => {
  const fundingsDate = {
    maxStartDate: moment().endOf('month').toDate(),
    minEndDate: moment().startOf('month').toDate(),
  };
  const eventsDate = {
    minStartDate: moment().subtract(2, 'month').endOf('month').toDate(),
    maxStartDate: moment().endOf('month').toDate(),
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

    getEventsGroupedByFundingsStub.returns([]);
    const fundingsMonitoring = await StatsHelper.getCustomerFundingsMonitoring(customerId);
    expect(fundingsMonitoring).toEqual([]);
    sinon.assert.calledWith(getEventsGroupedByFundingsStub, customerId, fundingsDate, eventsDate);
  });

  it('should return info if no events', async () => {
    const customerId = new ObjectID();

    getEventsGroupedByFundingsStub.returns([{
      thirdPartyPayer: { name: 'Tiers payeur' },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: moment().startOf('month').subtract(1, 'month'),
      careHours: 5,
      createdAt: '2019-10-01T14:06:16.089Z',
      prevMonthEvents: [],
      currentMonthEvents: [],
    }]);
    const fundingsMonitoring = await StatsHelper.getCustomerFundingsMonitoring(customerId);

    expect(fundingsMonitoring).toEqual([{
      thirdPartyPayer: 'Tiers payeur',
      currentMonthCareHours: 0,
      plannedCareHours: 5,
      prevMonthCareHours: 0,
    }]);
    sinon.assert.calledWith(getEventsGroupedByFundingsStub, customerId, fundingsDate, eventsDate);
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

    getEventsGroupedByFundingsStub.returns(eventsGroupedByFundings);
    const fundingsMonitoring = await StatsHelper.getCustomerFundingsMonitoring(customerId);

    expect(fundingsMonitoring).toEqual([{
      thirdPartyPayer: 'Tiers payeur',
      currentMonthCareHours: 6,
      plannedCareHours: 5,
      prevMonthCareHours: 3.5,
    }]);
    sinon.assert.calledWith(getEventsGroupedByFundingsStub, customerId, fundingsDate, eventsDate);
  });

  it('should return -1 for previous month if funding starts on current month', async () => {
    const eventsGroupedByFundings = [{
      thirdPartyPayer: { name: 'Tiers payeur' },
      careDays: [0, 1, 2, 3, 4, 5, 6, 7],
      startDate: moment().startOf('month'),
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

    getEventsGroupedByFundingsStub.returns(eventsGroupedByFundings);
    const fundingsMonitoring = await StatsHelper.getCustomerFundingsMonitoring(customerId);

    expect(fundingsMonitoring).toEqual([{
      thirdPartyPayer: 'Tiers payeur',
      currentMonthCareHours: 6,
      plannedCareHours: 5,
      prevMonthCareHours: -1,
    }]);
    sinon.assert.calledWith(getEventsGroupedByFundingsStub, customerId, fundingsDate, eventsDate);
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

  it('should format sector as array', async () => {
    const query = { sector: '5d1a40b7ecb0da251cfa4fe9', month: '102019' };
    getCustomersAndDurationBySector.returns({ cutomerCount: 9 });
    const result = await StatsHelper.getCustomersAndDurationBySector(query, credentials);

    expect(result).toEqual({ cutomerCount: 9 });
    sinon.assert.calledWithExactly(
      getCustomersAndDurationBySector,
      [new ObjectID('5d1a40b7ecb0da251cfa4fe9')],
      '102019',
      credentials.company._id
    );
  });

  it('should format array sector with objectId', async () => {
    const query = { sector: ['5d1a40b7ecb0da251cfa4fea', '5d1a40b7ecb0da251cfa4fe9'], month: '102019' };
    getCustomersAndDurationBySector.returns({ cutomerCount: 9 });
    const result = await StatsHelper.getCustomersAndDurationBySector(query, credentials);

    expect(result).toEqual({ cutomerCount: 9 });
    sinon.assert.calledWithExactly(
      getCustomersAndDurationBySector,
      [new ObjectID('5d1a40b7ecb0da251cfa4fea'), new ObjectID('5d1a40b7ecb0da251cfa4fe9')],
      '102019',
      credentials.company._id
    );
  });
});
