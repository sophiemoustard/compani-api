const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');

const User = require('../../../models/User');
const Customer = require('../../../models/Customer');
const Contract = require('../../../models/Contract');
const { populateEventSubscription, populateEvents, isCreationAllowed } = require('../../../helpers/events');
const {
  INTERVENTION,
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
  INTERNAL_HOUR,
} = require('../../../helpers/constants');

describe('populateEvent', () => {
  it('should populate subscription as event is an intervention', async () => {
    const event = {
      type: 'intervention',
      customer: {
        subscriptions: [
          {
            createdAt: '2019-01-11T08:38:18.653Z',
            _id: new ObjectID('5c3855fa12d1370abdda0b8f'),
            service: '5c35cdc2bd5e3e7360b853fa',
            unitTTCRate: 25,
            estimatedWeeklyVolume: 12,
            sundays: 2,
          },
          {
            createdAt: '2019-01-21T09:38:18.653Z',
            _id: new ObjectID('5c35b5eb1a6fb00997363eeb'),
            service: '5c35cdc2bd5e3e7360b853fa',
            unitTTCRate: 25,
            estimatedWeeklyVolume: 12,
            sundays: 2,
          }
        ],
      },
      subscription: new ObjectID('5c3855fa12d1370abdda0b8f'),
    };

    const result = await populateEventSubscription(event);
    expect(result.subscription).toBeDefined();
    expect(result.subscription._id).toEqual(event.subscription);
  });

  it('should not modify the input as event is not an intervention', async () => {
    const event = {
      type: 'absence',
    };

    const result = await populateEventSubscription(event);
    expect(result.subscription).not.toBeDefined();
    expect(result).toEqual(event);
  });

  it('should return an error as event is intervention but customer is undefined', async () => {
    const event = {
      type: 'intervention',
    };

    try {
      await populateEventSubscription(event);
    } catch (e) {
      expect(e.output.statusCode).toEqual(500);
    }
  });

  it('should throw an error as no corresopnding subscription is found in the customer', async () => {
    const event = {
      type: 'intervention',
      customer: {
        subscriptions: [
          {
            createdAt: '2019-01-21T09:38:18.653Z',
            _id: new ObjectID('5c35b5eb1a6fb00997363eeb'),
            service: '5c35cdc2bd5e3e7360b853fa',
            unitTTCRate: 25,
            estimatedWeeklyVolume: 12,
            sundays: 2,
          }
        ],
      },
      subscription: new ObjectID('5c3855fa12d1370abdda0b8f'),
    };

    try {
      await populateEventSubscription(event);
    } catch (e) {
      expect(e.output.statusCode).toEqual(500);
    }
  });
});

describe('populateEvents', () => {
  it('should populate subscription as event is an intervention', async () => {
    const events = [
      {
        type: 'intervention',
        customer: {
          subscriptions: [
            {
              createdAt: '2019-01-11T08:38:18.653Z',
              _id: new ObjectID('5c3855fa12d1370abdda0b8f'),
              service: '5c35cdc2bd5e3e7360b853fa',
              unitTTCRate: 25,
              estimatedWeeklyVolume: 12,
              sundays: 2,
            },
            {
              createdAt: '2019-01-21T09:38:18.653Z',
              _id: new ObjectID('5c35b5eb1a6fb00997363eeb'),
              service: '5c35cdc2bd5e3e7360b853fa',
              unitTTCRate: 25,
              estimatedWeeklyVolume: 12,
              sundays: 2,
            }
          ],
        },
        subscription: new ObjectID('5c3855fa12d1370abdda0b8f'),
      },
      {
        type: 'intervention',
        customer: {
          subscriptions: [
            {
              createdAt: '2019-01-12T08:38:18.653Z',
              _id: new ObjectID('5a3bc0315e421400147d5ecd'),
              service: '5ad8c41659769000142589f7',
              unitTTCRate: 25,
              estimatedWeeklyVolume: 12,
              sundays: 2,
            },
            {
              createdAt: '2019-01-22T09:38:18.653Z',
              _id: new ObjectID('5a3bc0005e421400147d5ec4'),
              service: '5a5735cb1f2a1f0014d48e14',
              unitTTCRate: 25,
              estimatedWeeklyVolume: 12,
              sundays: 2,
            }
          ],
        },
        subscription: new ObjectID('5a3bc0315e421400147d5ecd'),
      }
    ];

    const result = await populateEvents(events);
    expect(result[0].subscription).toBeDefined();
    expect(result[1].subscription).toBeDefined();
    expect(result[0].subscription._id).toEqual(events[0].subscription);
    expect(result[1].subscription._id).toEqual(events[1].subscription);
  });
});

describe('isCreationAllowed', () => {
  it('should return false as user has no contract', async () => {
    const payload = { auxiliary: new ObjectID() };

    const user = { _id: payload.auxiliary };
    User.findOne = () => user;
    user.populate = () => user;
    user.toObject = () => user;

    expect(await isCreationAllowed(payload)).toBeFalsy();
  });

  it('should return false if service event is customer contract and auxiliary does not have contract with customer', async () => {
    const subscriptionId = new ObjectID();
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
    };
    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: CUSTOMER_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).subtract(1, 'd') }],
      }]
    };
    Customer.findOne = () => customer;
    customer.populate = () => customer;
    customer.toObject = () => customer;

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{}],
      startDate: moment(payload.startDate).add(1, 'd'),
    };
    Contract.findOne = () => contract;

    const user = { _id: payload.auxiliary, contracts: [contract] };
    User.findOne = () => user;
    user.populate = () => user;
    user.toObject = () => user;

    expect(await isCreationAllowed(payload)).toBeFalsy();
  });

  it('should return true if service event is customer contract and auxiliary has contract with customer', async () => {
    const subscriptionId = new ObjectID();
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T00:00:00.000Z',
    };

    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: CUSTOMER_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).subtract(1, 'd') }],
      }]
    };
    Customer.findOne = () => customer;
    customer.populate = () => customer;
    customer.toObject = () => customer;

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{ isActive: true }],
      startDate: moment(payload.startDate).subtract(1, 'd'),
    };
    Contract.findOne = () => contract;

    const user = { _id: payload.auxiliary, contracts: [contract] };
    User.findOne = () => user;
    user.populate = () => user;
    user.toObject = () => user;

    expect(await isCreationAllowed(payload)).toBeTruthy();
  });

  it('should return false if company contract and no active contract on day', async () => {
    const subscriptionId = new ObjectID();
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T00:00:00.000Z',
    };

    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: COMPANY_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).subtract(1, 'd') }],
      }],
    };
    Customer.findOne = () => customer;
    customer.populate = () => customer;
    customer.toObject = () => customer;

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{}],
      status: COMPANY_CONTRACT,
      startDate: moment(payload.startDate).add(1, 'd'),
    };
    Contract.findOne = () => contract;

    const user = { _id: payload.auxiliary, contracts: [contract] };
    User.findOne = () => user;
    user.populate = () => user;
    user.toObject = () => user;

    expect(await isCreationAllowed(payload)).toBeFalsy();
  });

  it('should return true if company contract and active contract on day', async () => {
    const subscriptionId = new ObjectID();
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T00:00:00.000Z',
    };

    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: COMPANY_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).subtract(1, 'd') }],
      }]
    };
    Customer.findOne = () => customer;
    customer.populate = () => customer;
    customer.toObject = () => customer;

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{ isActive: true }],
      status: COMPANY_CONTRACT,
      startDate: moment(payload.startDate).subtract(1, 'd'),
    };
    Contract.findOne = () => contract;


    const user = { _id: payload.auxiliary, contracts: [contract] };
    User.findOne = () => user;
    user.populate = () => user;
    user.toObject = () => user;

    expect(await isCreationAllowed(payload)).toBeTruthy();
  });

  it('should return false if company contract and customer has no active subscription', async () => {
    const subscriptionId = new ObjectID();
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T00:00:00.000Z',
    };

    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: COMPANY_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).add(1, 'd') }],
      }]
    };
    Customer.findOne = () => customer;
    customer.populate = () => customer;
    customer.toObject = () => customer;

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{ isActive: true }],
      status: COMPANY_CONTRACT,
      startDate: moment(payload.startDate).subtract(1, 'd'),
    };
    Contract.findOne = () => contract;


    const user = { _id: payload.auxiliary, contracts: [contract] };
    User.findOne = () => user;
    user.populate = () => user;
    user.toObject = () => user;

    expect(await isCreationAllowed(payload)).toBeFalsy();
  });

  it('should return false if event is internal hour and auxiliary does not have contract with company', async () => {
    const payload = {
      auxiliary: new ObjectID(),
      type: INTERNAL_HOUR,
      startDate: '2019-10-03T00:00:00.000Z',
    };

    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: payload.subscription,
        service: { type: '', versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] }
      }]
    };
    Customer.findOne = () => customer;
    customer.populate = () => customer;
    customer.toObject = () => customer;

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{}],
      status: CUSTOMER_CONTRACT,
    };
    Contract.findOne = () => contract;

    const user = { _id: payload.auxiliary, contracts: [contract] };
    User.findOne = () => user;
    user.populate = () => user;
    user.toObject = () => user;

    expect(await isCreationAllowed(payload)).toBeFalsy();
  });
});
