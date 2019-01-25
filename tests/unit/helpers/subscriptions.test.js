const expect = require('expect');
const { ObjectID } = require('mongodb');
const { populateSubscriptionsSerivces, subscriptionsAccepted } = require('../../../helpers/subscriptions');
const Company = require('../../../models/Company');

describe('populateService', () => {
  it('should populate services', async () => {
    const customer = {
      subscriptions: [{
        versions: [{
          startDate: '2019-01-18T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:30.636Z',
          _id: new ObjectID('5c41f4d62fc4d8780f0628ea'),
          unitTTCRate: 13,
          estimatedWeeklyVolume: 12,
          sundays: 2,
        }, {
          startDate: '2019-01-19T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:37.471Z',
          _id: new ObjectID('5c41f4dd2fc4d8780f0628eb'),
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          sundays: 2,
          evenings: 0
        }],
        createdAt: '2019-01-18T15:46:30.637Z',
        _id: new ObjectID('5c41f4d62fc4d8780f0628e9'),
        service: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
      }],
    };
    Company.findOne = () => ({
      customersConfig: {
        services: [{
          _id: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
          nature: 'Horaire',
          versions: [{
            defaultUnitAmount: 25,
            vat: 5.5,
            holidaySurcharge: 10,
            eveningSurcharge: 25,
            name: 'Temps de qualité - Autonomie',
            startDate: '2019-01-18T15:37:30.636Z',
          }]
        }, {
          _id: new ObjectID('5c41f4e42fc4d8780f0628ec'),
          versions: [{
            name: 'Nuit',
            defaultUnitAmount: 175,
            vat: 12,
            startDate: '2019-01-19T18:46:30.636Z',
          }],
          nature: 'Horaire',
        }],
      }
    });

    const result = await populateSubscriptionsSerivces(customer);
    expect(result.subscriptions).toBeDefined();
    expect(result.subscriptions[0]._id).toEqual(customer.subscriptions[0]._id);
    expect(result.subscriptions[0].service).toBeDefined();
    expect(result.subscriptions[0].service).toEqual({
      _id: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
      name: 'Temps de qualité - Autonomie',
      nature: 'Horaire',
      defaultUnitAmount: 25,
      vat: 5.5,
      holidaySurcharge: 10,
      eveningSurcharge: 25,
    });
  });
});

describe('subscriptionsAccepted', () => {
  it('should set subscriptionsAccepted to true', async () => {
    const customer = {
      subscriptions: [{
        versions: [{
          startDate: '2019-01-18T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:30.636Z',
          _id: new ObjectID('5c41f4d62fc4d8780f0628ea'),
          unitTTCRate: 13,
          estimatedWeeklyVolume: 12,
          sundays: 2,
        }, {
          startDate: '2019-01-27T23:00:00.000Z',
          createdAt: '2019-01-18T15:46:37.471Z',
          _id: new ObjectID('5c41f4dd2fc4d8780f0628eb'),
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          sundays: 2,
          evenings: 3,
        }],
        createdAt: '2019-01-18T15:46:30.637Z',
        _id: new ObjectID('5c41f4d62fc4d8780f0628e9'),
        service: {
          _id: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
          nature: 'Horaire',
          defaultUnitAmount: 25,
          vat: 5.5,
          holidaySurcharge: 10,
          eveningSurcharge: 25,
          name: 'Temps de qualité - Autonomie',
          startDate: '2019-01-18T15:37:30.636Z',
        },
      }],
      subscriptionsHistory: [{
        helper: {
          firstname: 'Test',
          lastname: 'Test',
          title: '',
        },
        subscriptions: [{
          _id: new ObjectID('5c45a98fa2e4e133a6774e47'),
          service: 'Temps de qualité - Autonomie',
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          startDate: '2019-01-27T23:00:00.000Z',
          evenings: 3,
          sundays: 2,
        }],
        approvalDate: '2019-01-21T11:14:23.030Z',
        _id: new ObjectID('5c45a98fa2e4e133a6774e46')
      }],
    };
    Company.findOne = () => ({
      customersConfig: {
        services: [{
          _id: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
          nature: 'Horaire',
          versions: [{
            defaultUnitAmount: 25,
            vat: 5.5,
            holidaySurcharge: 10,
            eveningSurcharge: 25,
            name: 'Temps de qualité - Autonomie',
            startDate: '2019-01-18T15:37:30.636Z',
          }]
        }, {
          _id: new ObjectID('5c41f4e42fc4d8780f0628ec'),
          versions: [{
            name: 'Nuit',
            defaultUnitAmount: 175,
            vat: 12,
            startDate: '2019-01-19T18:46:30.636Z',
          }],
          nature: 'Horaire',
        }],
      }
    });

    const result = await subscriptionsAccepted(customer);
    expect(result).toBeDefined();
    expect(result.subscriptionsAccepted).toBeTruthy();
  });

  it('should set subscriptionsAccepted to false', async () => {
    const customer = {
      subscriptions: [{
        versions: [{
          startDate: '2019-01-18T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:30.636Z',
          _id: new ObjectID('5c41f4d62fc4d8780f0628ea'),
          unitTTCRate: 13,
          estimatedWeeklyVolume: 12,
          sundays: 2,
        }, {
          startDate: '2019-01-27T23:00:00.000Z',
          createdAt: '2019-01-18T15:46:37.471Z',
          _id: new ObjectID('5c41f4dd2fc4d8780f0628eb'),
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          sundays: 2,
          evenings: 3,
        }],
        createdAt: '2019-01-18T15:46:30.637Z',
        _id: new ObjectID('5c41f4d62fc4d8780f0628e9'),
        service: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
      }],
      subscriptionsHistory: [{
        helper: {
          firstname: 'Test',
          lastname: 'Test',
          title: '',
        },
        subscriptions: [{
          _id: new ObjectID('5c45a98fa2e4e133a6774e47'),
          service: 'Temps de qualité - Autonomie',
          unitTTCRate: 35,
          estimatedWeeklyVolume: 12,
          startDate: '2019-01-27T23:00:00.000Z',
        }],
        approvalDate: '2019-01-21T11:14:23.030Z',
        _id: new ObjectID('5c45a98fa2e4e133a6774e46')
      }],
    };
    Company.findOne = () => ({
      customersConfig: {
        services: [{
          _id: new ObjectID('5c35cdc2bd5e3e7360b853fa'),
          nature: 'Horaire',
          versions: [{
            defaultUnitAmount: 25,
            vat: 5.5,
            holidaySurcharge: 10,
            eveningSurcharge: 25,
            name: 'Temps de qualité - Autonomie',
            startDate: '2019-01-18T15:37:30.636Z',
          }]
        }],
      }
    });

    const result = await subscriptionsAccepted(customer);
    expect(result).toBeDefined();
    expect(result.subscriptionsAccepted).toBeFalsy();
  });
});
