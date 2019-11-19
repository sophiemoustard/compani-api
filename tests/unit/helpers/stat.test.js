const expect = require('expect');
// const moment = require('moment');
// const sinon = require('sinon');
const StatsHelper = require('../../../src/helpers/stats');

require('sinon-mongoose');

describe('getStatsOnCareHours', () => {
  it('should return empty array if no events', () => {
    const eventsGroupedByFundings = [];
    const statsOnCareHours = StatsHelper.getStatsOnCareHours(eventsGroupedByFundings);
    expect(statsOnCareHours).toEqual([]);
  });

  it('should return stats on care hours', () => {
    const eventsGroupedByFundings = [{
      _id: {
        thirdPartyPayer: {
          name: 'Tiers payeur',
        },
        versions: [
          {
            careDays: [
              0,
              1,
              2,
              3,
              4,
              5,
              6,
              7,
            ],
            startDate: '2019-11-04T23:00:00.000Z',
            careHours: 5,
            createdAt: '2019-11-18T14:06:16.089Z',
          },
        ],
      },
      eventsByMonth: [
        {
          date: '2019-11',
          events: [
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
        },
        {
          date: '2019-10',
          events: [
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
        },
      ],
    }];

    const statsOnCareHours = StatsHelper.getStatsOnCareHours(eventsGroupedByFundings);

    expect(statsOnCareHours).toEqual([{
      thirdPartyPayer: 'Tiers payeur',
      '2019-11': 6,
      plannedCareHours: 5,
      '2019-10': 3.5,
    }]);
  });
});
