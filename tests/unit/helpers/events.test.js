const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const User = require('../../../models/User');
const Event = require('../../../models/Event');
const Customer = require('../../../models/Customer');
const Contract = require('../../../models/Contract');
const Surcharge = require('../../../models/Surcharge');
const EventHelper = require('../../../helpers/events');
const EventHistoriesHelper = require('../../../helpers/eventHistories');
const UtilsHelper = require('../../../helpers/utils');
const EventRepository = require('../../../repositories/EventRepository');
const {
  INTERVENTION,
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
  INTERNAL_HOUR,
  ABSENCE,
  UNAVAILABILITY,
  NEVER,
  EVERY_WEEK,
  INVOICED_AND_NOT_PAYED,
  CUSTOMER_INITIATIVE,
} = require('../../../helpers/constants');

require('sinon-mongoose');

describe('updateEvent', () => {
  let createEventHistoryOnUpdate;
  let populateEventSubscription;
  let updateRepetitions;
  let updateEvent;
  beforeEach(() => {
    createEventHistoryOnUpdate = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnUpdate');
    populateEventSubscription = sinon.stub(EventHelper, 'populateEventSubscription');
    updateRepetitions = sinon.stub(EventHelper, 'updateRepetitions');
    updateEvent = sinon.stub(EventRepository, 'updateEvent');
  });
  afterEach(() => {
    createEventHistoryOnUpdate.restore();
    populateEventSubscription.restore();
    updateRepetitions.restore();
    updateEvent.restore();
  });

  it('1. should update absence without unset repetition property', async () => {
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, type: ABSENCE, auxiliary };
    const payload = { startDate: '2019-01-21T09:38:18.653Z', auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload);

    sinon.assert.calledWith(updateEvent, eventId, payload);
    sinon.assert.notCalled(updateRepetitions);
  });

  it('2. should update event without repetition without unset repetition property', async () => {
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, auxiliary };
    const payload = { startDate: '2019-01-21T09:38:18.653Z', auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload);

    sinon.assert.calledWith(updateEvent, eventId, payload);
    sinon.assert.notCalled(updateRepetitions);
  });

  it('3. should update event with NEVER frequency without unset repetition property', async () => {
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, repetition: { frequency: NEVER }, auxiliary };
    const payload = { startDate: '2019-01-21T09:38:18.653Z', auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload);

    sinon.assert.calledWith(updateEvent, eventId, payload);
    sinon.assert.notCalled(updateRepetitions);
  });

  it('4. should update event and repeated events without unset repetition property', async () => {
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, repetition: { frequency: EVERY_WEEK }, auxiliary };
    const payload = { startDate: '2019-01-21T09:38:18.653Z', shouldUpdateRepetition: true, auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload);

    sinon.assert.calledWith(updateEvent, eventId, payload);
    sinon.assert.callCount(updateRepetitions, 1);
  });

  it('5. should update event when only misc is updated without unset repetition property', async () => {
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const sector = new ObjectID();
    const event = {
      _id: eventId,
      startDate: '2019-01-21T09:38:18.653Z',
      repetition: { frequency: NEVER },
      auxiliary,
      sector,
    };
    const payload = { startDate: '2019-01-21T09:38:18.653Z', misc: 'Zoro est là', auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload);

    sinon.assert.calledWith(updateEvent, eventId, payload);
    sinon.assert.notCalled(updateRepetitions);
  });

  it('6. should update event and unset repetition property if event in repetition and repetition not updated', async () => {
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, repetition: { frequency: EVERY_WEEK }, auxiliary };
    const payload = { startDate: '2019-01-21T09:38:18.653Z', shouldUpdateRepetition: false, auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload);

    sinon.assert.calledWith(
      updateEvent,
      eventId,
      { ...payload, 'repetition.frequency': NEVER },
      { 'repetition.parentId': '' }
    );

    sinon.assert.notCalled(updateRepetitions);
  });

  it('7. should update event and unset cancel property when cancellation cancelled', async () => {
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = {
      _id: eventId,
      repetition: { frequency: NEVER },
      isCancelled: true,
      cancel: { condition: INVOICED_AND_NOT_PAYED, reason: CUSTOMER_INITIATIVE },
      auxiliary,
    };
    const payload = { startDate: '2019-01-21T09:38:18.653Z', shouldUpdateRepetition: false, auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload);

    sinon.assert.calledWith(
      updateEvent,
      eventId,
      { ...payload, isCancelled: false },
      { cancel: '' }
    );
    sinon.assert.notCalled(updateRepetitions);
  });

  it('8. should update event and unset cancel adn repetition property when cancellation cancelled and repetition not updated', async () => {
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = {
      _id: eventId,
      repetition: { frequency: EVERY_WEEK },
      isCancelled: true,
      cancel: { condition: INVOICED_AND_NOT_PAYED, reason: CUSTOMER_INITIATIVE },
      auxiliary,
    };
    const payload = { startDate: '2019-01-21T09:38:18.653Z', shouldUpdateRepetition: false, auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload);
    sinon.assert.calledWith(
      updateEvent,
      eventId,
      { ...payload, isCancelled: false, 'repetition.frequency': NEVER },
      { cancel: '', 'repetition.parentId': '' }
    );
    sinon.assert.notCalled(updateRepetitions);
  });

  it('9. should update event and unset auxiliary if missing in payload', async () => {
    const eventId = new ObjectID();
    const event = { _id: eventId };
    const payload = { startDate: '2019-01-21T09:38:18.653Z' };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload);

    sinon.assert.notCalled(updateRepetitions);
    sinon.assert.calledWith(
      updateEvent,
      eventId,
      payload,
      { auxiliary: '' }
    );
  });
});

describe('populateEventSubscription', () => {
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
          },
        ],
      },
      subscription: new ObjectID('5c3855fa12d1370abdda0b8f'),
    };

    const result = await EventHelper.populateEventSubscription(event);
    expect(result.subscription).toBeDefined();
    expect(result.subscription._id).toEqual(event.subscription);
  });

  it('should not modify the input as event is not an intervention', async () => {
    const event = {
      type: 'absence',
    };

    const result = await EventHelper.populateEventSubscription(event);
    expect(result.subscription).not.toBeDefined();
    expect(result).toEqual(event);
  });

  it('should return an error as event is intervention but customer is undefined', async () => {
    const event = {
      type: 'intervention',
    };

    try {
      await EventHelper.populateEventSubscription(event);
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
          },
        ],
      },
      subscription: new ObjectID('5c3855fa12d1370abdda0b8f'),
    };

    try {
      await EventHelper.populateEventSubscription(event);
    } catch (e) {
      expect(e.output.statusCode).toEqual(500);
    }
  });
});

describe('populateEvents', () => {
  let populateEventSubscription;
  beforeEach(() => {
    populateEventSubscription = sinon.stub(EventHelper, 'populateEventSubscription');
  });
  afterEach(() => {
    populateEventSubscription.restore();
  });

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
            },
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
            },
          ],
        },
        subscription: new ObjectID('5a3bc0315e421400147d5ecd'),
      },
    ];

    await EventHelper.populateEvents(events);
    sinon.assert.callCount(populateEventSubscription, events.length);
  });
});

describe('hasConflicts', () => {
  let getAuxiliaryEventsBetweenDates;
  beforeEach(() => {
    getAuxiliaryEventsBetweenDates = sinon.stub(EventRepository, 'getAuxiliaryEventsBetweenDates');
  });
  afterEach(() => {
    getAuxiliaryEventsBetweenDates.restore();
  });

  it('should return true if event has conflicts', async () => {
    const event = {
      _id: new ObjectID(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: new ObjectID(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: new ObjectID(), startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' },
    ]);
    const result = await EventHelper.hasConflicts(event);

    expect(result).toBeTruthy();
  });

  it('should return false if event does not have conflicts', async () => {
    const event = {
      _id: new ObjectID(),
      startDate: '2019-10-02T15:00:00.000Z',
      endDate: '2019-10-02T16:00:00.000Z',
      auxiliary: new ObjectID(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: new ObjectID(), startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' },
    ]);
    const result = await EventHelper.hasConflicts(event);

    expect(result).toBeFalsy();
  });

  it('should return false if event has conflicts only with cancelled events', async () => {
    const event = {
      _id: new ObjectID(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: new ObjectID(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: new ObjectID(), startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z', isCancelled: true },
    ]);
    const result = await EventHelper.hasConflicts(event);

    expect(result).toBeFalsy();
  });
});

describe('isCreationAllowed', () => {
  let hasConflicts;
  let UserModel;
  let CustomerModel;
  let findOneContract;
  let findOneSurcharge;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventHelper, 'hasConflicts');
    UserModel = sinon.mock(User);
    CustomerModel = sinon.mock(Customer);
    findOneContract = sinon.stub(Contract, 'findOne');
    findOneSurcharge = sinon.stub(Surcharge, 'findOne');
  });
  afterEach(() => {
    hasConflicts.restore();
    UserModel.restore();
    CustomerModel.restore();
    findOneContract.restore();
    findOneSurcharge.restore();
  });

  it('should return false as event has conflicts', async () => {
    const payload = {
      auxiliary: new ObjectID(),
      startDate: '2019-10-02T08:00:00.000Z',
      endDate: '2019-10-02T10:00:00.000Z',
    };

    hasConflicts.returns(true);
    const result = await EventHelper.isCreationAllowed(payload);

    expect(result).toBeFalsy();
  });

  it('should return false as user has no contract', async () => {
    const payload = { auxiliary: new ObjectID() };

    const user = { _id: payload.auxiliary };
    UserModel.expects('findOne')
      .withExactArgs({ _id: payload.auxiliary })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);

    hasConflicts.returns(false);
    const result = await EventHelper.isCreationAllowed(payload);

    expect(result).toBeFalsy();
  });

  it('should return false if service event is customer contract and auxiliary does not have contract with customer', async () => {
    const subscriptionId = new ObjectID();
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-02T08:00:00.000Z',
      endDate: '2019-10-02T10:00:00.000Z',
    };
    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: CUSTOMER_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).subtract(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = new Contract({
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{}],
      startDate: moment(payload.startDate).add(1, 'd'),
    });
    findOneContract.returns(contract);

    const user = { _id: payload.auxiliary, contracts: [contract] };
    UserModel.expects('findOne')
      .withExactArgs({ _id: payload.auxiliary })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);

    hasConflicts.returns(false);
    const result = await EventHelper.isCreationAllowed(payload);
    expect(result).toBeFalsy();
  });

  it('should return true if service event is customer contract and auxiliary has contract with customer', async () => {
    const subscriptionId = new ObjectID();
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
    };

    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: CUSTOMER_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).subtract(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{ isActive: true }],
      startDate: moment(payload.startDate).subtract(1, 'd'),
    };
    findOneContract.returns(contract);

    const user = { _id: payload.auxiliary, contracts: [contract] };
    UserModel.expects('findOne')
      .withExactArgs({ _id: payload.auxiliary })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);

    hasConflicts.returns(false);
    const result = await EventHelper.isCreationAllowed(payload);

    expect(result).toBeTruthy();
  });

  it('should return false if company contract and no active contract on day', async () => {
    const subscriptionId = new ObjectID();
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
    };

    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: COMPANY_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).subtract(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{}],
      status: COMPANY_CONTRACT,
      startDate: moment(payload.startDate).add(1, 'd'),
    };
    findOneContract.returns(contract);

    const user = { _id: payload.auxiliary, contracts: [contract] };
    UserModel.expects('findOne')
      .withExactArgs({ _id: payload.auxiliary })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);

    hasConflicts.returns(false);
    const result = await EventHelper.isCreationAllowed(payload);

    expect(result).toBeFalsy();
  });

  it('should return true if company contract and active contract on day', async () => {
    const subscriptionId = new ObjectID();
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
    };

    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: COMPANY_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).subtract(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{ isActive: true }],
      status: COMPANY_CONTRACT,
      startDate: moment(payload.startDate).subtract(1, 'd'),
    };
    findOneContract.returns(contract);

    const user = { _id: payload.auxiliary, contracts: [contract] };
    UserModel.expects('findOne')
      .withExactArgs({ _id: payload.auxiliary })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);

    hasConflicts.returns(false);
    const result = await EventHelper.isCreationAllowed(payload);

    expect(result).toBeTruthy();
  });

  it('should return false if company contract and customer has no subscription', async () => {
    const payload = {
      auxiliary: new ObjectID(),
      customer: new ObjectID(),
      type: INTERVENTION,
      subscription: (new ObjectID()).toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
    };

    const customer = {
      _id: payload.customer,
      subscriptions: [{
        _id: new ObjectID(),
        service: { type: COMPANY_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(payload.startDate).add(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{ isActive: true }],
      status: COMPANY_CONTRACT,
      startDate: moment(payload.startDate).subtract(1, 'd'),
    };
    findOneContract.returns(contract);

    const user = { _id: payload.auxiliary, contracts: [contract] };
    UserModel.expects('findOne')
      .withExactArgs({ _id: payload.auxiliary })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);

    hasConflicts.returns(false);
    const result = await EventHelper.isCreationAllowed(payload);

    expect(result).toBeFalsy();
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
        service: { type: '', versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: payload.auxiliary,
      customer: payload.customer,
      versions: [{}],
      status: CUSTOMER_CONTRACT,
    };
    findOneContract.returns(contract);

    const user = { _id: payload.auxiliary, contracts: [contract] };
    UserModel.expects('findOne')
      .withExactArgs({ _id: payload.auxiliary })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);

    hasConflicts.returns(false);
    const result = await EventHelper.isCreationAllowed(payload);

    expect(result).toBeFalsy();
  });
});

describe('isEditionAllowed', () => {
  let isCreationAllowed;
  beforeEach(() => {
    isCreationAllowed = sinon.stub(EventHelper, 'isCreationAllowed');
  });
  afterEach(() => {
    isCreationAllowed.restore();
  });

  it('should return false as event is billed', async () => {
    const eventFromDb = {
      isBilled: true,
      type: INTERVENTION,
    };
    const payload = {};

    const result = await EventHelper.isEditionAllowed(eventFromDb, payload);
    expect(result).toBeFalsy();
    sinon.assert.notCalled(isCreationAllowed);
  });

  it('should return false as event is absence and auxiliary is updated', async () => {
    const eventFromDb = {
      type: ABSENCE,
      auxiliary: new ObjectID(),
    };
    const payload = { auxiliary: '1234567890' };

    const result = await EventHelper.isEditionAllowed(eventFromDb, payload);
    expect(result).toBeFalsy();
    sinon.assert.notCalled(isCreationAllowed);
  });

  it('should return false as event is unavailability and auxiliary is updated', async () => {
    const eventFromDb = {
      type: UNAVAILABILITY,
      auxiliary: new ObjectID(),
    };
    const payload = { auxiliary: '1234567890' };

    const result = await EventHelper.isEditionAllowed(eventFromDb, payload);
    expect(result).toBeFalsy();
    sinon.assert.notCalled(isCreationAllowed);
  });

  it('should call isCreationAllowed for unassigned event', async () => {
    const eventFromDb = {
      type: INTERVENTION,
      auxiliary: new ObjectID(),
    };
    const payload = { isCancelled: false };

    isCreationAllowed.returns(false);

    const result = await EventHelper.isEditionAllowed(eventFromDb, payload);
    expect(result).toBeFalsy();
    sinon.assert.calledWith(isCreationAllowed, { isCancelled: false, type: INTERVENTION });
  });

  it('should call isCreationAllowed for event with auxiliary', async () => {
    const auxiliary = new ObjectID();
    const eventFromDb = {
      type: INTERVENTION,
      auxiliary,
    };
    const payload = { isCancelled: false, auxiliary, type: INTERVENTION };

    isCreationAllowed.returns(true);

    const result = await EventHelper.isEditionAllowed(eventFromDb, payload);
    expect(result).toBeTruthy();
    sinon.assert.calledWith(isCreationAllowed, { isCancelled: false, type: INTERVENTION, auxiliary });
  });
});

describe('unassignInterventions', () => {
  let getCustomerSubscriptions = null;
  let unassignInterventions = null;

  const customerId = new ObjectID();
  const userId = new ObjectID();
  const aggregation = [{
    customer: { _id: customerId },
    sub: {
      _id: 'qwerty',
      service: { type: COMPANY_CONTRACT },
    },
  }, {
    customer: { _id: customerId },
    sub: {
      _id: 'asdfgh',
      service: { type: CUSTOMER_CONTRACT },
    },
  }];

  beforeEach(() => {
    getCustomerSubscriptions = sinon.stub(EventRepository, 'getCustomerSubscriptions');
    unassignInterventions = sinon.stub(EventRepository, 'unassignInterventions');
  });
  afterEach(() => {
    getCustomerSubscriptions.restore();
    unassignInterventions.restore();
  });

  it('should unassign future events linked to company contract', async () => {
    const contract = { status: COMPANY_CONTRACT, endDate: moment().toDate(), user: userId };
    getCustomerSubscriptions.returns(aggregation);

    await EventHelper.unassignInterventions(contract);
    sinon.assert.called(getCustomerSubscriptions);
    sinon.assert.calledWith(
      unassignInterventions,
      contract.endDate,
      contract.user,
      [aggregation[0].sub._id]
    );
  });

  it('should unassign future events linked to corresponding customer contract', async () => {
    const contract = { status: CUSTOMER_CONTRACT, endDate: moment().toDate(), user: userId, customer: customerId };
    getCustomerSubscriptions.returns(aggregation);

    await EventHelper.unassignInterventions(contract);
    sinon.assert.called(getCustomerSubscriptions);
    sinon.assert.calledWith(
      unassignInterventions,
      contract.endDate,
      contract.user,
      [aggregation[1].sub._id]
    );
  });
});

describe('exportWorkingEventsHistory', () => {
  const header = ['Type', 'Heure interne', 'Début', 'Fin', 'Durée', 'Répétition', 'Secteur', 'Auxiliaire', 'Bénéficiaire', 'Divers', 'Facturé', 'Annulé', 'Statut de l\'annulation', 'Raison de l\'annulation'];
  const events = [
    {
      isCancelled: false,
      isBilled: true,
      type: 'intervention',
      repetition: { frequency: 'every_week' },
      sector: { name: 'Girafes - 75' },
      subscription: {},
      customer: {
        identity: {
          title: 'Mme',
          firstname: 'Mimi',
          lastname: 'Mathy',
        },
      },
      auxiliary: {
        identity: {
          firstname: 'Jean-Claude',
          lastname: 'Van Damme',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
    }, {
      isCancelled: true,
      cancel: {
        condition: 'invoiced_and_not_payed',
        reason: 'auxiliary_initiative',
      },
      isBilled: false,
      type: 'internalHour',
      internalHour: { name: 'Formation' },
      repetition: { frequency: 'never' },
      sector: { name: 'Etoiles - 75' },
      subscription: {},
      customer: {
        identity: {
          title: 'M',
          firstname: 'Bojack',
          lastname: 'Horseman',
        },
      },
      auxiliary: {
        identity: {
          firstname: 'Princess',
          lastname: 'Carolyn',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
      misc: 'brbr',
    },
  ];
  let getWorkingEventsForExport;
  beforeEach(() => {
    getWorkingEventsForExport = sinon.stub(EventRepository, 'getWorkingEventsForExport');
  });
  afterEach(() => {
    getWorkingEventsForExport.restore();
  });

  it('should return an array containing just the header', async () => {
    getWorkingEventsForExport.returns([]);
    const exportArray = await EventHelper.exportWorkingEventsHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    getWorkingEventsForExport.returns(events);
    const getFullTitleFromIdentityStub = sinon.stub(UtilsHelper, 'getFullTitleFromIdentity');
    const names = ['Jean-Claude VAN DAMME', 'Mme Mimi MATHY', 'Princess CAROLYN', 'M Bojack HORSEMAN'];
    for (const [i, name] of names.entries()) getFullTitleFromIdentityStub.onCall(i).returns(name);

    const exportArray = await EventHelper.exportWorkingEventsHistory(null, null);

    sinon.assert.callCount(getFullTitleFromIdentityStub, names.length);
    expect(exportArray).toEqual([
      header,
      ['Intervention', '', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', 'Une fois par semaine', 'Girafes - 75', 'Jean-Claude VAN DAMME', 'Mme Mimi MATHY', '', 'Oui', 'Non', '', ''],
      ['Heure interne', 'Formation', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', '', 'Etoiles - 75', 'Princess CAROLYN', 'M Bojack HORSEMAN', 'brbr', 'Non', 'Oui', 'Facturée & non payée', 'Initiative du de l\'intervenant'],
    ]);

    getFullTitleFromIdentityStub.restore();
  });
});

describe('exportAbsencesHistory', () => {
  const header = ['Type', 'Nature', 'Début', 'Fin', 'Secteur', 'Auxiliaire', 'Divers'];
  const events = [
    {
      type: 'absence',
      absence: 'unjustified absence',
      absenceNature: 'hourly',
      sector: { name: 'Girafes - 75' },
      auxiliary: {
        identity: {
          firstname: 'Jean-Claude',
          lastname: 'Van Damme',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
    }, {
      type: 'absence',
      absence: 'leave',
      absenceNature: 'daily',
      internalHour: { name: 'Formation' },
      sector: { name: 'Etoiles - 75' },
      auxiliary: {
        identity: {
          firstname: 'Princess',
          lastname: 'Carolyn',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
      misc: 'brbr',
    },
  ];
  let getAbsencesForExport;

  beforeEach(() => {
    getAbsencesForExport = sinon.stub(EventRepository, 'getAbsencesForExport');
  });

  afterEach(() => {
    getAbsencesForExport.restore();
  });

  it('should return an array containing just the header', async () => {
    getAbsencesForExport.returns([]);
    const exportArray = await EventHelper.exportAbsencesHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    getAbsencesForExport.returns(events);
    const getFullTitleFromIdentityStub = sinon.stub(UtilsHelper, 'getFullTitleFromIdentity');
    const names = ['Jean-Claude VAN DAMME', 'Princess CAROLYN'];
    for (const [i, name] of names.entries()) getFullTitleFromIdentityStub.onCall(i).returns(name);

    const exportArray = await EventHelper.exportAbsencesHistory(null, null);

    sinon.assert.callCount(getFullTitleFromIdentityStub, names.length);
    expect(exportArray).toEqual([
      header,
      ['Absence injustifiée', 'Horaire', '20/05/2019 08:00', '20/05/2019 10:00', 'Girafes - 75', 'Jean-Claude VAN DAMME', ''],
      ['Congé', 'Journalière', '20/05/2019', '20/05/2019', 'Etoiles - 75', 'Princess CAROLYN', 'brbr'],
    ]);

    getFullTitleFromIdentityStub.restore();
  });
});

describe('formatRepeatedEvent', () => {
  it('should format event', () => {
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const event = {
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
    };

    const result = EventHelper.formatRepeatedEvent(event, day);

    expect(result).toBeDefined();
    expect(result.startDate).toEqual(moment('2019-07-17').startOf('d').toDate());
    expect(result.endDate).toEqual(moment('2019-07-18').startOf('d').toDate());
  });
});

describe('createEvent', () => {
  let save;
  let isCreationAllowed;
  let createEventHistoryOnCreate;
  let populateEventSubscription;
  let createRepetitions;
  let getEvent;
  beforeEach(() => {
    save = sinon.stub(Event.prototype, 'save');
    isCreationAllowed = sinon.stub(EventHelper, 'isCreationAllowed');
    createEventHistoryOnCreate = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnCreate');
    populateEventSubscription = sinon.stub(EventHelper, 'populateEventSubscription');
    createRepetitions = sinon.stub(EventHelper, 'createRepetitions');
    getEvent = sinon.stub(EventRepository, 'getEvent');
  });
  afterEach(() => {
    save.restore();
    isCreationAllowed.restore();
    createEventHistoryOnCreate.restore();
    populateEventSubscription.restore();
    createRepetitions.restore();
    getEvent.restore();
  });

  it('should not create as creation is not allowed', async () => {
    isCreationAllowed.returns(false);
    try {
      await EventHelper.createEvent({}, {});
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(422);
    }
  });

  it('should create as creation is allowed', async () => {
    const newEvent = new Event({
      type: ABSENCE,
    });

    isCreationAllowed.returns(true);
    getEvent.returns(newEvent);

    await EventHelper.createEvent({}, {});

    sinon.assert.called(createEventHistoryOnCreate);
    sinon.assert.called(save);
    sinon.assert.calledWith(getEvent);
    sinon.assert.notCalled(createRepetitions);
    sinon.assert.called(populateEventSubscription);
  });

  it('should create repetitions as creation is a repetition', async () => {
    const payload = { repetition: { frequency: EVERY_WEEK } };
    const newEvent = new Event({
      type: INTERVENTION,
    });

    isCreationAllowed.returns(true);
    getEvent.returns(newEvent);

    await EventHelper.createEvent(payload, {});

    sinon.assert.called(createEventHistoryOnCreate);
    sinon.assert.called(save);
    sinon.assert.called(getEvent);
    sinon.assert.called(createRepetitions);
    sinon.assert.called(populateEventSubscription);
  });
});

describe('deleteRepetition', () => {
  let findOne;
  let createEventHistoryOnDelete;
  let deleteMany;
  const params = { _id: new ObjectID() };
  const credentials = { _id: new ObjectID() };
  beforeEach(() => {
    findOne = sinon.stub(Event, 'findOne');
    createEventHistoryOnDelete = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnDelete');
    deleteMany = sinon.stub(Event, 'deleteMany');
  });
  afterEach(() => {
    findOne.restore();
    createEventHistoryOnDelete.restore();
    deleteMany.restore();
  });

  it('should return null if event not found', async () => {
    findOne.returns(null);
    const result = await EventHelper.deleteRepetition(params, {});

    expect(result).toBeNull();
  });

  it('should delete repetition', async () => {
    const parentId = new ObjectID();
    const event = {
      type: INTERVENTION,
      repetition: {
        frequency: EVERY_WEEK,
        parentId,
      },
      startDate: '2019-01-21T09:38:18.653Z',
    };
    findOne.returns(event);
    const result = await EventHelper.deleteRepetition(params, credentials);

    expect(result).toEqual(event);
    sinon.assert.calledWith(createEventHistoryOnDelete, event, credentials);
    sinon.assert.calledWith(
      deleteMany,
      {
        'repetition.parentId': parentId,
        startDate: { $gte: new Date(event.startDate) },
        $or: [{ isBilled: false }, { isBilled: { $exists: false } }],
      }
    );
  });

  it('should not delete repetition as event is absence', async () => {
    const event = {
      type: ABSENCE,
      repetition: { frequency: EVERY_WEEK },
      startDate: '2019-01-21T09:38:18.653Z',
    };
    findOne.returns(event);
    const result = await EventHelper.deleteRepetition(params, credentials);

    expect(result).toEqual(event);
    sinon.assert.calledWith(createEventHistoryOnDelete, event, credentials);
    sinon.assert.notCalled(deleteMany);
  });

  it('should not delete repetition as event is not a repetition', async () => {
    const parentId = new ObjectID();
    const event = {
      type: INTERVENTION,
      repetition: {
        frequency: NEVER,
        parentId,
      },
      startDate: '2019-01-21T09:38:18.653Z',
    };
    findOne.returns(event);
    const result = await EventHelper.deleteRepetition(params, credentials);

    expect(result).toEqual(event);
    sinon.assert.calledWith(createEventHistoryOnDelete, event, credentials);
    sinon.assert.notCalled(deleteMany);
  });
});

describe('deleteEvent', () => {
  let findOne;
  let createEventHistoryOnDelete;
  let deleteOne;
  const params = { _id: new ObjectID() };
  const credentials = { _id: new ObjectID() };
  beforeEach(() => {
    findOne = sinon.stub(Event, 'findOne');
    createEventHistoryOnDelete = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnDelete');
    deleteOne = sinon.stub(Event, 'deleteOne');
  });
  afterEach(() => {
    findOne.restore();
    createEventHistoryOnDelete.restore();
    deleteOne.restore();
  });

  it('should return null if event not found', async () => {
    findOne.returns(null);
    const result = await EventHelper.deleteEvent(params, {});

    expect(result).toBeNull();
  });

  it('should delete repetition', async () => {
    const parentId = new ObjectID();
    const deletionInfo = {
      type: INTERVENTION,
      startDate: '2019-01-21T09:38:18.653Z',
    };
    const event = {
      ...deletionInfo,
      repetition: {
        frequency: EVERY_WEEK,
        parentId,
      },
    };
    findOne.returns(event);
    const result = await EventHelper.deleteEvent(params, credentials);

    expect(result).toEqual(event);
    sinon.assert.calledWith(createEventHistoryOnDelete, deletionInfo, credentials);
    sinon.assert.calledWith(deleteOne, { _id: params._id });
  });
});
