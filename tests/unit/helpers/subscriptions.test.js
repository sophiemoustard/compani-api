const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const omit = require('lodash/omit');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const Customer = require('../../../src/models/Customer');
const SinonMongoose = require('../sinonMongoose');

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

describe('populateSubscriptionsServices', () => {
  let populateService;
  beforeEach(() => {
    populateService = sinon.stub(SubscriptionsHelper, 'populateService');
  });
  afterEach(() => {
    populateService.restore();
  });

  it('should return customer if subscriptions array is missing', () => {
    const customer = { identity: { firstname: 'Toto' } };

    const result = SubscriptionsHelper.populateSubscriptionsServices(customer);

    expect(result).toEqual({ identity: { firstname: 'Toto' } });
    sinon.assert.notCalled(populateService);
  });

  it('should return customer with subscriptions services populated', () => {
    const customer = {
      identity: { firstname: 'Toto' },
      subscriptions: [
        { versions: [{ unitTTCRate: 13, weeklyCount: 12 }], service: { nature: 'fixed' } },
        { versions: [{ unitTTCRate: 12, weeklyHours: 20 }], service: { nature: 'hourly' } },
      ],
    };
    populateService.onCall(0).returns({ nature: 'fixed', name: 'toto' });
    populateService.onCall(1).returns({ nature: 'hourly', name: 'pouet' });

    const result = SubscriptionsHelper.populateSubscriptionsServices(customer);

    expect(result).toEqual({
      identity: { firstname: 'Toto' },
      subscriptions: [
        { versions: [{ unitTTCRate: 13, weeklyCount: 12 }], service: { nature: 'fixed', name: 'toto' } },
        { versions: [{ unitTTCRate: 12, weeklyHours: 20 }], service: { nature: 'hourly', name: 'pouet' } },
      ],
    });

    sinon.assert.calledWithExactly(populateService.getCall(0), { nature: 'fixed' });
    sinon.assert.calledWithExactly(populateService.getCall(1), { nature: 'hourly' });
  });
});

describe('subscriptionsAccepted', () => {
  it('should set subscriptionsAccepted to true', async () => {
    const subId = new ObjectId();
    const subId2 = new ObjectId();
    const customer = {
      subscriptions: [
        {
          versions: [
            {
              startDate: '2019-01-18T15:46:30.636Z',
              createdAt: '2019-01-18T15:46:30.636Z',
              _id: new ObjectId(),
              unitTTCRate: 13,
              weeklyHours: 12,
              saturdays: 2,
              sundays: 2,
            },
            {
              startDate: '2019-01-27T23:00:00.000Z',
              createdAt: '2019-01-18T15:46:37.471Z',
              _id: new ObjectId(),
              unitTTCRate: 24,
              weeklyHours: 12,
              saturdays: 2,
              sundays: 2,
              evenings: 3,
            },
          ],
          createdAt: '2019-01-18T15:46:30.637Z',
          _id: subId,
          service: {
            _id: new ObjectId(),
            nature: 'Horaire',
            defaultUnitAmount: 25,
            vat: 5.5,
            holidaySurcharge: 10,
            eveningSurcharge: 25,
            name: 'Temps de qualité - Autonomie',
            startDate: '2019-01-18T15:37:30.636Z',
          },
        },
        {
          versions: [
            {
              startDate: '2019-01-18T15:46:30.636Z',
              createdAt: '2019-01-18T15:46:30.636Z',
              _id: new ObjectId(),
              unitTTCRate: 123,
              weeklyCount: 4,
            },
          ],
          createdAt: '2019-01-18T15:46:30.637Z',
          _id: subId2,
          service: {
            _id: new ObjectId(),
            nature: 'fixed',
            defaultUnitAmount: 25,
            vat: 5.5,
            name: 'forfaitaire',
            startDate: '2019-01-18T15:37:30.636Z',
          },
        },
      ],
      subscriptionsHistory: [
        {
          helper: {
            firstname: 'Test',
            lastname: 'Test',
            title: '',
          },
          subscriptions: [
            {
              _id: new ObjectId(),
              service: 'Temps de qualité - Autonomie',
              unitTTCRate: 24,
              weeklyHours: 12,
              startDate: '2019-01-27T23:00:00.000Z',
              evenings: 3,
              saturdays: 2,
              sundays: 2,
              subscriptionId: subId,
            },
            {
              _id: new ObjectId(),
              service: 'forfaitaire',
              unitTTCRate: 123,
              weeklyCount: 4,
              startDate: '2019-01-27T23:00:00.000Z',
              subscriptionId: subId2,
            },
          ],
          approvalDate: '2019-01-21T11:14:23.030Z',
          _id: new ObjectId(),
        },
      ],
    };

    const result = await SubscriptionsHelper.subscriptionsAccepted(customer);

    expect(result).toBeDefined();
    expect(result.subscriptionsAccepted).toBeTruthy();
  });

  it('should set subscriptionsAccepted to false', async () => {
    const customer = {
      subscriptions: [
        {
          versions: [
            {
              startDate: '2019-01-18T15:46:30.636Z',
              createdAt: '2019-01-18T15:46:30.636Z',
              _id: new ObjectId(),
              unitTTCRate: 13,
              weeklyHours: 12,
              saturdays: 2,
              sundays: 2,
            },
            {
              startDate: '2019-01-27T23:00:00.000Z',
              createdAt: '2019-01-18T15:46:37.471Z',
              _id: new ObjectId(),
              unitTTCRate: 24,
              weeklyHours: 12,
              saturdays: 2,
              sundays: 2,
              evenings: 3,
            },
          ],
          createdAt: '2019-01-18T15:46:30.637Z',
          _id: new ObjectId(),
          service: new ObjectId(),
        },
      ],
      subscriptionsHistory: [
        {
          helper: { firstname: 'Test', lastname: 'Test', title: '' },
          subscriptions: [
            {
              _id: new ObjectId(),
              service: 'Temps de qualité - Autonomie',
              unitTTCRate: 35,
              weeklyHours: 12,
              startDate: '2019-01-27T23:00:00.000Z',
              subscriptionId: new ObjectId(),
            },
          ],
          approvalDate: '2019-01-21T11:14:23.030Z',
          _id: new ObjectId(),
        },
      ],
    };

    const result = await SubscriptionsHelper.subscriptionsAccepted(customer);
    expect(result).toBeDefined();
    expect(result.subscriptionsAccepted).toBeFalsy();
  });
});

describe('updateSubscription', () => {
  let findOneAndUpdate;
  let populateSubscriptionsServices;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(Customer, 'findOneAndUpdate');
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
    populateSubscriptionsServices.restore();
  });

  it('should update subscription', async () => {
    const customerId = new ObjectId();
    const subscriptionId = new ObjectId();
    const params = { _id: customerId.toHexString(), subscriptionId: subscriptionId.toHexString() };
    const payload = { evenings: 2 };
    const customer = {
      _id: customerId,
      subscriptions: [{ _id: subscriptionId, evenings: 2, service: new ObjectId() }],
    };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries(customer));
    populateSubscriptionsServices.returns(customer);

    const result = await SubscriptionsHelper.updateSubscription(params, payload);

    expect(result).toEqual(customer);
    sinon.assert.calledWithExactly(populateSubscriptionsServices, customer);
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId.toHexString(), 'subscriptions._id': subscriptionId.toHexString() },
            { $push: { 'subscriptions.$.versions': payload } },
            { new: true, select: { identity: 1, subscriptions: 1 }, autopopulate: false },
          ],
        },
        { query: 'populate', args: [{ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('addSubscription', () => {
  let findById;
  let findOneAndUpdate;
  let populateSubscriptionsServices;
  beforeEach(() => {
    findById = sinon.stub(Customer, 'findById');
    findOneAndUpdate = sinon.stub(Customer, 'findOneAndUpdate');
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
  });
  afterEach(() => {
    findById.restore();
    findOneAndUpdate.restore();
    populateSubscriptionsServices.restore();
  });

  it('should add this first subscription', async () => {
    const customerId = new ObjectId();
    const customer = { _id: customerId };
    const payload = { service: new ObjectId(), weeklyHours: 10 };

    findById.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));
    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries(customer));
    populateSubscriptionsServices.returns(customer);

    const result = await SubscriptionsHelper.addSubscription(customerId, payload);

    expect(result).toEqual(customer);
    sinon.assert.calledWithExactly(populateSubscriptionsServices, customer);
    SinonMongoose.calledOnceWithExactly(findById, [{ query: 'findById', args: [customerId] }, { query: 'lean' }]);
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId },
            { $push: { subscriptions: payload } },
            { new: true, select: { identity: 1, subscriptions: 1 }, autopopulate: false },
          ],
        },
        { query: 'populate', args: [{ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } }] },
        { query: 'lean' },
      ]
    );
  });

  it('should add the second subscription', async () => {
    const customerId = new ObjectId();
    const customer = { _id: customerId, subscriptions: [{ service: new ObjectId() }] };
    const payload = { service: (new ObjectId()).toHexString(), weeklyHours: 10 };

    findById.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));
    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries(customer));
    populateSubscriptionsServices.returns(customer);

    const result = await SubscriptionsHelper.addSubscription(customerId, payload);

    expect(result).toEqual(customer);
    sinon.assert.calledWithExactly(populateSubscriptionsServices, customer);
    SinonMongoose.calledOnceWithExactly(findById, [{ query: 'findById', args: [customerId] }, { query: 'lean' }]);
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId },
            { $push: { subscriptions: payload } },
            { new: true, select: { identity: 1, subscriptions: 1 }, autopopulate: false },
          ],
        },
        { query: 'populate', args: [{ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } }] },
        { query: 'lean' },
      ]
    );
  });

  it('should throw an error if service is already subscribed', async () => {
    const customerId = new ObjectId();
    try {
      const serviceId = new ObjectId();
      const customer = { _id: customerId, subscriptions: [{ service: serviceId }] };
      const payload = { service: serviceId.toHexString(), weeklyHours: 10 };

      findById.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));

      await SubscriptionsHelper.addSubscription(customerId, payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      SinonMongoose.calledOnceWithExactly(findById, [{ query: 'findById', args: [customerId] }, { query: 'lean' }]);
      sinon.assert.notCalled(populateSubscriptionsServices);
      sinon.assert.notCalled(findOneAndUpdate);
    }
  });
});

describe('deleteSubscription', () => {
  const customerId = new ObjectId();
  const subscriptionId = new ObjectId();
  const secondSubId = new ObjectId();

  let updateOne;
  let findByIdCustomer;
  beforeEach(() => {
    updateOne = sinon.stub(Customer, 'updateOne');
    findByIdCustomer = sinon.stub(Customer, 'findById');
  });
  afterEach(() => {
    updateOne.restore();
    findByIdCustomer.restore();
  });

  it('should delete subscription and the subscriptionhistory associated', async () => {
    findByIdCustomer.returns(SinonMongoose.stubChainedQueries(
      {
        subscriptionsHistory: [
          { subscriptions: [{ subscriptionId }] },
          { subscriptions: [{ subscriptionId }, { subscriptionId: secondSubId }] },
        ],
      },
      ['lean']
    ));

    await SubscriptionsHelper.deleteSubscription(customerId.toHexString(), subscriptionId.toHexString());

    sinon.assert.calledWithExactly(
      updateOne,
      { _id: customerId.toHexString() },
      {
        $pull: { subscriptions: { _id: subscriptionId.toHexString() } },
        $set: { subscriptionsHistory: [{ subscriptions: [{ subscriptionId: secondSubId }] }] },
      }
    );
    SinonMongoose.calledOnceWithExactly(
      findByIdCustomer,
      [{ query: 'findById', args: [customerId.toHexString()] }, { query: 'lean' }]
    );
  });
});

describe('createSubscriptionHistory', () => {
  let findOneAndUpdateCustomer;
  beforeEach(() => {
    findOneAndUpdateCustomer = sinon.stub(Customer, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneAndUpdateCustomer.restore();
  });

  it('should create subscription history', async () => {
    const customerId = new ObjectId();
    const payload = { evenings: 2 };
    const customer = { _id: customerId };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));

    const result = await SubscriptionsHelper.createSubscriptionHistory(customerId.toHexString(), payload);

    expect(result).toEqual(customer);
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId.toHexString() },
            { $push: { subscriptionsHistory: payload } },
            { new: true, select: { identity: 1, subscriptionsHistory: 1 }, autopopulate: false },
          ],
        },
        { query: 'lean' },
      ]
    );
  });
});
