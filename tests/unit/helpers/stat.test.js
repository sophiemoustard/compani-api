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
      startDate: '2019-09-30T23:00:00.000Z',
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
      startDate: '2019-09-30T23:00:00.000Z',
      careHours: 5,
      createdAt: '2019-10-01T14:06:16.089Z',
      currentMonthEvents: [
        {
          startDate: '2019-11-10T14:00:18.653Z',
          endDate: '2019-11-10T16:00:18.653Z',
        },
        {
          startDate: '2019-11-10T11:00:18.653Z',
          endDate: '2019-11-10T15:00:18.653Z',
        },
      ],
      prevMonthEvents: [
        {
          type: 'intervention',
          startDate: '2019-10-10T10:00:18.653Z',
          endDate: '2019-10-10T12:00:18.653Z',
        },
        {
          type: 'intervention',
          startDate: '2019-10-10T09:00:18.653Z',
          endDate: '2019-10-10T10:30:18.653Z',
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
          type: 'intervention',
          startDate: '2019-11-10T14:00:18.653Z',
          endDate: '2019-11-10T16:00:18.653Z',
        },
        {
          type: 'intervention',
          startDate: '2019-11-10T11:00:18.653Z',
          endDate: '2019-11-10T15:00:18.653Z',
        },
      ],
      prevMonthEvents: [
        {
          type: 'intervention',
          startDate: '2019-10-10T10:00:18.653Z',
          endDate: '2019-10-10T12:00:18.653Z',
        },
        {
          type: 'intervention',
          startDate: '2019-10-10T09:00:18.653Z',
          endDate: '2019-10-10T10:30:18.653Z',
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
