const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const omit = require('lodash/omit');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');

describe('populateService', () => {
  it('should return null if no service or no version', () => {
    const result = SubscriptionsHelper.populateService();
    expect(result).toBe(null);
  });

  it('should return service correctly populated', () => {
    const service = {
      _id: new ObjectId(),
      isArchived: true,
      versions: [
        {
          _id: new ObjectId(),
          startDate: '2019-01-18T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:30.636Z',
          unitTTCRate: 13,
          weeklyHours: 12,
          sundays: 2,
        },
        {
          _id: new ObjectId(),
          startDate: '2020-01-18T15:46:30.636Z',
          createdAt: '2019-12-17T15:46:30.636Z',
          unitTTCRate: 1,
          weeklyHours: 20,
          sundays: 1,
        },
      ],
    };

    const result = SubscriptionsHelper.populateService(service);
    expect(result).toStrictEqual({
      ...omit(service, 'versions'),
      isArchived: true,
      startDate: '2020-01-18T15:46:30.636Z',
      createdAt: '2019-12-17T15:46:30.636Z',
      unitTTCRate: 1,
      weeklyHours: 20,
      sundays: 1,
    });
  });
});
