const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const Company = require('../../../src/models/Company');
const Customer = require('../../../src/models/Customer');

require('sinon-mongoose');

describe('populateService', () => {
  it('should return null if no service or no version', () => {
    const result = SubscriptionsHelper.populateService();
    expect(result).toBe(null);
  });

  it('should return service correctly populated', () => {
    const service = {
      _id: new ObjectID(),
      isArchived: true,
      versions: [
        {
          _id: new ObjectID(),
          startDate: '2019-01-18T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:30.636Z',
          unitTTCRate: 13,
          estimatedWeeklyVolume: 12,
          sundays: 2,
        },
        {
          _id: new ObjectID(),
          startDate: '2020-01-18T15:46:30.636Z',
          createdAt: '2019-12-17T15:46:30.636Z',
          unitTTCRate: 1,
          estimatedWeeklyVolume: 20,
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
      estimatedWeeklyVolume: 20,
      sundays: 1,
    });
  });
});

describe('subscriptionsAccepted', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(Company, 'findOne');
  });

  afterEach(() => {
    findOne.restore();
  });

  it('should set subscriptionsAccepted to true', async () => {
    const subId = new ObjectID();
    const customer = {
      subscriptions: [{
        versions: [{
          startDate: '2019-01-18T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:30.636Z',
          _id: new ObjectID(),
          unitTTCRate: 13,
          estimatedWeeklyVolume: 12,
          sundays: 2,
        }, {
          startDate: '2019-01-27T23:00:00.000Z',
          createdAt: '2019-01-18T15:46:37.471Z',
          _id: new ObjectID(),
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          sundays: 2,
          evenings: 3,
        }],
        createdAt: '2019-01-18T15:46:30.637Z',
        _id: subId,
        service: {
          _id: new ObjectID(),
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
          _id: new ObjectID(),
          service: 'Temps de qualité - Autonomie',
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          startDate: '2019-01-27T23:00:00.000Z',
          evenings: 3,
          sundays: 2,
          subscriptionId: subId,
        }],
        approvalDate: '2019-01-21T11:14:23.030Z',
        _id: new ObjectID(),
      }],
    };

    findOne.returns({
      customersConfig: {
        services: [{
          _id: new ObjectID(),
          nature: 'Horaire',
          versions: [{
            defaultUnitAmount: 25,
            vat: 5.5,
            holidaySurcharge: 10,
            eveningSurcharge: 25,
            name: 'Temps de qualité - Autonomie',
            startDate: '2019-01-18T15:37:30.636Z',
          }],
        }, {
          _id: new ObjectID(),
          versions: [{
            name: 'Nuit',
            defaultUnitAmount: 175,
            vat: 12,
            startDate: '2019-01-19T18:46:30.636Z',
          }],
          nature: 'Horaire',
        }],
      },
    });

    const result = await SubscriptionsHelper.subscriptionsAccepted(customer);
    expect(result).toBeDefined();
    expect(result.subscriptionsAccepted).toBeTruthy();
  });

  it('should set subscriptionsAccepted to false', async () => {
    const customer = {
      subscriptions: [{
        versions: [{
          startDate: '2019-01-18T15:46:30.636Z',
          createdAt: '2019-01-18T15:46:30.636Z',
          _id: new ObjectID(),
          unitTTCRate: 13,
          estimatedWeeklyVolume: 12,
          sundays: 2,
        }, {
          startDate: '2019-01-27T23:00:00.000Z',
          createdAt: '2019-01-18T15:46:37.471Z',
          _id: new ObjectID(),
          unitTTCRate: 24,
          estimatedWeeklyVolume: 12,
          sundays: 2,
          evenings: 3,
        }],
        createdAt: '2019-01-18T15:46:30.637Z',
        _id: new ObjectID(),
        service: new ObjectID(),
      }],
      subscriptionsHistory: [{
        helper: {
          firstname: 'Test',
          lastname: 'Test',
          title: '',
        },
        subscriptions: [{
          _id: new ObjectID(),
          service: 'Temps de qualité - Autonomie',
          unitTTCRate: 35,
          estimatedWeeklyVolume: 12,
          startDate: '2019-01-27T23:00:00.000Z',
          subscriptionId: new ObjectID(),
        }],
        approvalDate: '2019-01-21T11:14:23.030Z',
        _id: new ObjectID(),
      }],
    };

    findOne.returns({
      customersConfig: {
        services: [{
          _id: new ObjectID(),
          nature: 'Horaire',
          versions: [{
            defaultUnitAmount: 25,
            vat: 5.5,
            holidaySurcharge: 10,
            eveningSurcharge: 25,
            name: 'Temps de qualité - Autonomie',
            startDate: '2019-01-18T15:37:30.636Z',
          }],
        }],
      },
    });

    const result = await SubscriptionsHelper.subscriptionsAccepted(customer);
    expect(result).toBeDefined();
    expect(result.subscriptionsAccepted).toBeFalsy();
  });
});

describe('updateSubscription', () => {
  let CustomerMock;
  let populateSubscriptionsServices;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
  });
  afterEach(() => {
    CustomerMock.restore();
    populateSubscriptionsServices.restore();
  });

  it('should update subscription', async () => {
    const customerId = new ObjectID();
    const subscriptionId = new ObjectID();
    const params = { _id: customerId.toHexString(), subscriptionId: subscriptionId.toHexString() };
    const payload = { evenings: 2 };
    const customer = {
      _id: customerId,
      subscriptions: [{ _id: subscriptionId, evenings: 2, service: new ObjectID() }],
    };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId.toHexString(), 'subscriptions._id': subscriptionId.toHexString() },
        { $push: { 'subscriptions.$.versions': payload } },
        { new: true, select: { identity: 1, subscriptions: 1 }, autopopulate: false }
      )
      .chain('populate')
      .withExactArgs({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
      .chain('lean')
      .once()
      .returns(customer);
    populateSubscriptionsServices.returns(customer);

    const result = await SubscriptionsHelper.updateSubscription(params, payload);
    expect(result).toEqual(customer);
    sinon.assert.calledWithExactly(populateSubscriptionsServices, customer);
    CustomerMock.verify();
  });
});

describe('addSubscription', () => {
  let CustomerMock;
  let populateSubscriptionsServices;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
  });
  afterEach(() => {
    CustomerMock.restore();
    populateSubscriptionsServices.restore();
  });

  it('should add this first subscription', async () => {
    const customerId = new ObjectID();
    const customer = { _id: customerId };
    const payload = { service: new ObjectID(), estimatedWeeklyVolume: 10 };

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId },
        { $push: { subscriptions: payload } },
        { new: true, select: { identity: 1, subscriptions: 1 }, autopopulate: false }
      )
      .chain('populate')
      .withExactArgs({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
      .chain('lean')
      .once()
      .returns(customer);
    populateSubscriptionsServices.returns(customer);

    const result = await SubscriptionsHelper.addSubscription(customerId, payload);
    expect(result).toEqual(customer);
    sinon.assert.calledWithExactly(populateSubscriptionsServices, customer);
    CustomerMock.verify();
  });

  it('should add the second subscription', async () => {
    const customerId = new ObjectID();
    const customer = { _id: customerId, subscriptions: [{ service: new ObjectID() }] };
    const payload = { service: (new ObjectID()).toHexString(), estimatedWeeklyVolume: 10 };

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId },
        { $push: { subscriptions: payload } },
        { new: true, select: { identity: 1, subscriptions: 1 }, autopopulate: false }
      )
      .chain('populate')
      .withExactArgs({ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } })
      .chain('lean')
      .once()
      .returns(customer);
    populateSubscriptionsServices.returns(customer);

    const result = await SubscriptionsHelper.addSubscription(customerId, payload);
    expect(result).toEqual(customer);
    sinon.assert.calledWithExactly(populateSubscriptionsServices, customer);
    CustomerMock.verify();
  });

  it('should throw an error if service is already subscribed', async () => {
    try {
      const customerId = new ObjectID();
      const serviceId = new ObjectID();
      const customer = { _id: customerId, subscriptions: [{ service: serviceId }] };
      const payload = { service: serviceId.toHexString(), estimatedWeeklyVolume: 10 };

      CustomerMock.expects('findById')
        .withExactArgs(customerId)
        .chain('lean')
        .once()
        .returns(customer);
      CustomerMock.expects('findOneAndUpdate').never();

      await SubscriptionsHelper.addSubscription(customerId, payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.notCalled(populateSubscriptionsServices);
      CustomerMock.verify();
    }
  });
});

describe('deleteSubscription', () => {
  const customerId = new ObjectID();
  const subscriptionId = new ObjectID();
  const secondSubId = new ObjectID();

  let updateOne;
  let CustomerMock;
  beforeEach(() => {
    updateOne = sinon.stub(Customer, 'updateOne');
    CustomerMock = sinon.mock(Customer);
  });
  afterEach(() => {
    updateOne.restore();
    CustomerMock.restore();
  });

  it('should delete subscription and the subscriptionhistory associated', async () => {
    CustomerMock.expects('findById')
      .chain('lean')
      .returns({
        subscriptionsHistory: [
          { subscriptions: [{ subscriptionId }] },
          { subscriptions: [{ subscriptionId }, { subscriptionId: secondSubId }] },
        ],
      });

    await SubscriptionsHelper.deleteSubscription(customerId.toHexString(), subscriptionId.toHexString());
    sinon.assert.calledWithExactly(
      updateOne,
      { _id: customerId.toHexString() },
      {
        $pull: { subscriptions: { _id: subscriptionId.toHexString() } },
        $set: { subscriptionsHistory: [{ subscriptions: [{ subscriptionId: secondSubId }] }] },
      }
    );
    CustomerMock.verify();
  });
});

describe('createSubscriptionHistory', () => {
  let CustomerMock;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
  });
  afterEach(() => {
    CustomerMock.restore();
  });

  it('should create subscription history', async () => {
    const customerId = new ObjectID();
    const payload = { evenings: 2 };
    const customer = { _id: customerId };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId.toHexString() },
        { $push: { subscriptionsHistory: payload } },
        { new: true, select: { identity: 1, subscriptionsHistory: 1 }, autopopulate: false }
      )
      .chain('lean')
      .once()
      .returns(customer);

    const result = await SubscriptionsHelper.createSubscriptionHistory(customerId.toHexString(), payload);
    expect(result).toEqual(customer);
    CustomerMock.verify();
  });
});
