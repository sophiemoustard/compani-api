const expect = require('expect');
const sinon = require('sinon');
const Boom = require('boom');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const Event = require('../../../src/models/Event');
const Repetition = require('../../../src/models/Repetition');
const EventHelper = require('../../../src/helpers/events');
const ContractHelper = require('../../../src/helpers/contracts');
const UtilsHelper = require('../../../src/helpers/utils');
const EventsRepetitionHelper = require('../../../src/helpers/eventsRepetition');
const EventHistoriesHelper = require('../../../src/helpers/eventHistories');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const EventRepository = require('../../../src/repositories/EventRepository');
const {
  INTERVENTION,
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
  INTERNAL_HOUR,
  ABSENCE,
  UNAVAILABILITY,
  NEVER,
  EVERY_WEEK,
  INVOICED_AND_NOT_PAID,
  CUSTOMER_INITIATIVE,
} = require('../../../src/helpers/constants');

require('sinon-mongoose');

describe('updateEvent', () => {
  let createEventHistoryOnUpdate;
  let populateEventSubscription;
  let updateRepetition;
  let updateEvent;
  let deleteConflictInternalHoursAndUnavailabilities;
  let unassignConflictInterventions;
  beforeEach(() => {
    createEventHistoryOnUpdate = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnUpdate');
    populateEventSubscription = sinon.stub(EventHelper, 'populateEventSubscription');
    updateRepetition = sinon.stub(EventsRepetitionHelper, 'updateRepetition');
    updateEvent = sinon.stub(EventRepository, 'updateEvent');
    deleteConflictInternalHoursAndUnavailabilities = sinon.stub(EventHelper, 'deleteConflictInternalHoursAndUnavailabilities');
    unassignConflictInterventions = sinon.stub(EventHelper, 'unassignConflictInterventions');
  });
  afterEach(() => {
    createEventHistoryOnUpdate.restore();
    populateEventSubscription.restore();
    updateRepetition.restore();
    updateEvent.restore();
    deleteConflictInternalHoursAndUnavailabilities.restore();
    unassignConflictInterventions.restore();
  });

  it('should update repetition', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, type: INTERVENTION, auxiliary, repetition: { frequency: 'every_week' } };
    const payload = { startDate: '2019-01-21T09:38:18', auxiliary: auxiliary.toHexString(), shouldUpdateRepetition: true };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.called(updateRepetition);
    sinon.assert.notCalled(updateEvent);
  });

  it('should update absence without unset repetition property', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const event = { _id: eventId, type: ABSENCE, auxiliary: { _id: auxiliaryId } };
    const payload = { startDate: '2019-01-21T09:38:18', auxiliary: auxiliaryId.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.calledWithExactly(updateEvent, eventId, payload, null, credentials);
    sinon.assert.notCalled(updateRepetition);
  });

  it('should update absence, unassign interventions and delete unavailabilities and internal hours in conflict', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const event = {
      _id: eventId,
      type: ABSENCE,
      auxiliary: { _id: auxiliaryId },
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T10:38:18',
    };
    const payload = { startDate: '2019-01-21T09:38:18', auxiliary: auxiliaryId.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.calledWith(updateEvent, eventId, payload);
    sinon.assert.calledWith(
      unassignConflictInterventions,
      { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' },
      auxiliaryId.toHexString(),
      credentials
    );
    sinon.assert.calledWith(
      deleteConflictInternalHoursAndUnavailabilities,
      { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' },
      auxiliaryId.toHexString(),
      eventId.toHexString(),
      credentials
    );
  });

  it('should update event without repetition without unset repetition property', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, auxiliary };
    const payload = { startDate: '2019-01-21T09:38:18', auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.calledWithExactly(updateEvent, eventId, payload, null, credentials);
    sinon.assert.notCalled(updateRepetition);
  });

  it('should update event with NEVER frequency without unset repetition property', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, repetition: { frequency: NEVER }, auxiliary };
    const payload = { startDate: '2019-01-21T09:38:18', auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.calledWithExactly(updateEvent, eventId, payload, null, credentials);
    sinon.assert.notCalled(updateRepetition);
  });

  it('should update event when only misc is updated without unset repetition property', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const sector = new ObjectID();
    const event = {
      _id: eventId,
      startDate: '2019-01-21T09:38:18',
      repetition: { frequency: NEVER },
      auxiliary,
      sector,
    };
    const payload = { startDate: '2019-01-21T09:38:18', misc: 'Zoro est là', auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.calledWithExactly(updateEvent, eventId, payload, null, credentials);
    sinon.assert.notCalled(updateRepetition);
  });

  it('should update event and unset repetition property if event in repetition and repetition not updated', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, repetition: { frequency: EVERY_WEEK }, auxiliary };
    const payload = { startDate: '2019-01-21T09:38:18', shouldUpdateRepetition: false, auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.calledWith(
      updateEvent,
      eventId,
      { ...payload, 'repetition.frequency': NEVER }
    );

    sinon.assert.notCalled(updateRepetition);
  });

  it('should update event and unset cancel property when cancellation cancelled', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = {
      _id: eventId,
      repetition: { frequency: NEVER },
      isCancelled: true,
      cancel: { condition: INVOICED_AND_NOT_PAID, reason: CUSTOMER_INITIATIVE },
      auxiliary,
    };
    const payload = { startDate: '2019-01-21T09:38:18', shouldUpdateRepetition: false, auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.calledWithExactly(
      updateEvent,
      eventId,
      { ...payload, isCancelled: false },
      { cancel: '' },
      credentials
    );
    sinon.assert.notCalled(updateRepetition);
  });

  it('should update event and unset cancel adn repetition property when cancellation cancelled and repetition not updated', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = {
      _id: eventId,
      repetition: { frequency: EVERY_WEEK },
      isCancelled: true,
      cancel: { condition: INVOICED_AND_NOT_PAID, reason: CUSTOMER_INITIATIVE },
      auxiliary,
    };
    const payload = { startDate: '2019-01-21T09:38:18', shouldUpdateRepetition: false, auxiliary: auxiliary.toHexString() };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);
    sinon.assert.calledWithExactly(
      updateEvent,
      eventId,
      { ...payload, isCancelled: false, 'repetition.frequency': NEVER },
      { cancel: '' },
      credentials
    );
    sinon.assert.notCalled(updateRepetition);
  });

  it('should update event and unset auxiliary if missing in payload', async () => {
    const credentials = { _id: new ObjectID() };
    const eventId = new ObjectID();
    const event = { _id: eventId };
    const payload = { startDate: '2019-01-21T09:38:18' };

    updateEvent.returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.notCalled(updateRepetition);
    sinon.assert.calledWithExactly(
      updateEvent,
      eventId,
      payload,
      { auxiliary: '' },
      credentials
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
            createdAt: '2019-01-21T09:38:18',
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
            createdAt: '2019-01-21T09:38:18',
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
              createdAt: '2019-01-21T09:38:18',
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

describe('unassignInterventionsOnContractEnd', () => {
  let getCustomerSubscriptions;
  let getUnassignedInterventions;
  let createEventHistoryOnUpdate;
  let updateManyEvent;
  let updateManyRepetition;

  const customerId = new ObjectID();
  const userId = new ObjectID();
  const credentials = { _id: userId };
  const aggregation = [{
    customer: { _id: customerId },
    sub: { _id: 'qwerty', service: { type: COMPANY_CONTRACT } },
  }, {
    customer: { _id: customerId },
    sub: { _id: 'asdfgh', service: { type: CUSTOMER_CONTRACT } },
  }];

  const interventions = [
    {
      _id: null,
      events: [{
        _id: new ObjectID(),
        type: 'intervention',
        startDate: '2019-10-02T10:00:00.000Z',
        endDate: '2019-10-02T12:00:00.000Z',
        auxiliary: userId,
      }],
    },
    {
      _id: new ObjectID(),
      events: [{
        _id: new ObjectID(),
        misc: 'toto',
        type: 'intervention',
        startDate: '2019-10-02T11:00:00.000Z',
        endDate: '2019-10-02T13:00:00.000Z',
        auxiliary: userId,
      }],
    },
  ];

  beforeEach(() => {
    getCustomerSubscriptions = sinon.stub(EventRepository, 'getCustomerSubscriptions');
    getUnassignedInterventions = sinon.stub(EventRepository, 'getUnassignedInterventions');
    createEventHistoryOnUpdate = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnUpdate');
    updateManyEvent = sinon.stub(Event, 'updateMany');
    updateManyRepetition = sinon.stub(Repetition, 'updateMany');
  });
  afterEach(() => {
    getCustomerSubscriptions.restore();
    getUnassignedInterventions.restore();
    createEventHistoryOnUpdate.restore();
    updateManyEvent.restore();
    updateManyRepetition.restore();
  });

  it('should unassign future events linked to company contract', async () => {
    const contract = { status: COMPANY_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId };
    getCustomerSubscriptions.returns(aggregation);
    getUnassignedInterventions.returns(interventions);

    await EventHelper.unassignInterventionsOnContractEnd(contract, credentials);
    sinon.assert.called(getCustomerSubscriptions);
    sinon.assert.calledWith(
      getUnassignedInterventions,
      contract.endDate,
      contract.user,
      [aggregation[0].sub._id]
    );
    sinon.assert.calledTwice(createEventHistoryOnUpdate);
    sinon.assert.calledWith(
      updateManyEvent,
      { _id: { $in: [interventions[0].events[0]._id, interventions[1].events[0]._id] } },
      { $set: { 'repetition.frequency': NEVER }, $unset: { auxiliary: '' } }
    );
    sinon.assert.calledWith(updateManyRepetition, { auxiliary: userId }, { $unset: { auxiliary: '' } });
  });

  it('should create event history for repetition', async () => {
    const contract = { status: COMPANY_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId };
    getCustomerSubscriptions.returns(aggregation);
    getUnassignedInterventions.returns([interventions[1]]);

    await EventHelper.unassignInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWith(
      createEventHistoryOnUpdate,
      { misc: 'toto', startDate: '2019-10-02T11:00:00.000Z', endDate: '2019-10-02T13:00:00.000Z', shouldUpdateRepetition: true }
    );
    sinon.assert.calledWith(
      updateManyEvent,
      { _id: { $in: [interventions[1].events[0]._id] } },
      { $set: { 'repetition.frequency': NEVER }, $unset: { auxiliary: '' } }
    );
    sinon.assert.calledWith(updateManyRepetition, { auxiliary: userId }, { $unset: { auxiliary: '' } });
  });

  it('should create event history for non repeated event', async () => {
    const contract = { status: COMPANY_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId };
    getCustomerSubscriptions.returns(aggregation);
    getUnassignedInterventions.returns([interventions[0]]);

    await EventHelper.unassignInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWith(
      createEventHistoryOnUpdate,
      { misc: undefined, startDate: '2019-10-02T10:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' }
    );
    sinon.assert.calledWith(
      updateManyEvent,
      { _id: { $in: [interventions[0].events[0]._id] } },
      { $set: { 'repetition.frequency': NEVER }, $unset: { auxiliary: '' } }
    );
    sinon.assert.calledWith(updateManyRepetition, { auxiliary: userId }, { $unset: { auxiliary: '' } });
  });

  it('should unassign future events linked to corresponding customer contract', async () => {
    const contract = { status: CUSTOMER_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId, customer: customerId };
    getCustomerSubscriptions.returns(aggregation);
    getUnassignedInterventions.returns(interventions);

    await EventHelper.unassignInterventionsOnContractEnd(contract, credentials);
    sinon.assert.called(getCustomerSubscriptions);
    sinon.assert.calledWith(
      getUnassignedInterventions,
      contract.endDate,
      contract.user,
      [aggregation[1].sub._id]
    );
    sinon.assert.calledTwice(createEventHistoryOnUpdate);
    sinon.assert.calledWith(
      updateManyEvent,
      { _id: { $in: [interventions[0].events[0]._id, interventions[1].events[0]._id] } },
      { $set: { 'repetition.frequency': NEVER }, $unset: { auxiliary: '' } }
    );
    sinon.assert.calledWith(updateManyRepetition, { auxiliary: userId }, { $unset: { auxiliary: '' } });
  });
});

describe('removeEventsExceptInterventionsOnContractEnd', () => {
  let getEventsExceptInterventions;
  let createEventHistoryOnDelete;
  let deleteMany;
  const customerId = new ObjectID();
  const userId = new ObjectID();
  const credentials = { _id: userId };
  const events = [
    {
      _id: new ObjectID(),
      events: [{
        _id: new ObjectID(),
        type: 'internal_hour',
        startDate: '2019-10-02T10:00:00.000Z',
        endDate: '2019-10-02T12:00:00.000Z',
        auxiliary: userId,
      }],
    },
    {
      _id: new ObjectID(),
      events: [{
        _id: new ObjectID(),
        type: 'unavailability',
        startDate: '2019-10-02T11:00:00.000Z',
        endDate: '2019-10-02T13:00:00.000Z',
        auxiliary: userId,
      }],
    },
  ];

  beforeEach(() => {
    getEventsExceptInterventions = sinon.stub(EventRepository, 'getEventsExceptInterventions');
    createEventHistoryOnDelete = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnDelete');
    deleteMany = sinon.stub(Event, 'deleteMany');
  });
  afterEach(() => {
    getEventsExceptInterventions.restore();
    createEventHistoryOnDelete.restore();
    deleteMany.restore();
  });

  it('should remove future non-intervention events linked to company contract', async () => {
    const contract = { status: COMPANY_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId };
    getEventsExceptInterventions.returns(events);

    await EventHelper.removeEventsExceptInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWith(getEventsExceptInterventions, '2019-10-02T08:00:00.000Z', userId);
    sinon.assert.calledTwice(createEventHistoryOnDelete);
    sinon.assert.calledWith(deleteMany, { _id: { $in: [events[0].events[0]._id, events[1].events[0]._id] } });
  });

  it('should create event history for repetition', async () => {
    const contract = { status: COMPANY_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId };
    getEventsExceptInterventions.returns([events[1]]);

    await EventHelper.removeEventsExceptInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWith(createEventHistoryOnDelete, events[1].events[0], credentials);
    sinon.assert.calledWith(deleteMany, { _id: { $in: [events[1].events[0]._id] } });
  });

  it('should create event history for non repeated event', async () => {
    const contract = { status: COMPANY_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId };
    getEventsExceptInterventions.returns([events[0]]);

    await EventHelper.removeEventsExceptInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWith(createEventHistoryOnDelete, events[0].events[0], credentials);
    sinon.assert.calledWith(deleteMany, { _id: { $in: [events[0].events[0]._id] } });
  });

  it('should remove future non-intervention events linked to corresponding customer contract', async () => {
    const contract = { status: CUSTOMER_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId, customer: customerId };
    getEventsExceptInterventions.returns(events);

    await EventHelper.removeEventsExceptInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWith(getEventsExceptInterventions, '2019-10-02T08:00:00.000Z', userId);
    sinon.assert.calledTwice(createEventHistoryOnDelete);
    sinon.assert.calledWith(deleteMany, { _id: { $in: [events[0].events[0]._id, events[1].events[0]._id] } });
  });
});

describe('deleteList', () => {
  let deleteEventsStub;
  let deleteRepetitionStub;
  let EventModel;
  let getEventsGroupedByParentIdStub;
  const customerId = new ObjectID();
  const userId = new ObjectID();
  const credentials = { _id: userId };

  beforeEach(() => {
    deleteEventsStub = sinon.stub(EventHelper, 'deleteEvents');
    deleteRepetitionStub = sinon.stub(EventsRepetitionHelper, 'deleteRepetition');
    EventModel = sinon.mock(Event);
    getEventsGroupedByParentIdStub = sinon.stub(EventRepository, 'getEventsGroupedByParentId');
  });
  afterEach(() => {
    deleteEventsStub.restore();
    deleteRepetitionStub.restore();
    EventModel.restore();
    getEventsGroupedByParentIdStub.restore();
  });

  it('should delete all events between start and end date and not delete the repetition', async () => {
    const startDate = '2019-10-10';
    const endDate = '2019-10-19';
    const query = {
      customer: customerId,
      startDate: { $gte: moment('2019-10-10').toDate(), $lte: moment('2019-10-19').endOf('d').toDate() },
    };
    const events = [
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'internal_hour',
        repetition: { frequency: NEVER },
        startDate: '2019-10-12T10:00:00.000Z',
        endDate: '2019-10-12T12:00:00.000Z',
        auxiliary: userId,
      },
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'unavailability',
        repetition: { frequency: EVERY_WEEK, parentId: new ObjectID() },
        startDate: '2019-10-09T11:00:00.000Z',
        endDate: '2019-10-09T13:00:00.000Z',
        auxiliary: userId,
      },
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'unavailability',
        repetition: { frequency: NEVER, parentId: new ObjectID() },
        startDate: '2019-10-7T11:30:00.000Z',
        endDate: '2019-10-7T13:00:00.000Z',
        auxiliary: userId,
      },
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'unavailability',
        startDate: '2019-10-20T11:00:00.000Z',
        endDate: '2019-10-20T13:00:00.000Z',
        auxiliary: userId,
      },
    ];
    EventModel.expects('countDocuments')
      .withExactArgs({ ...query, isBilled: true })
      .once()
      .returns(0);

    const eventsGroupedByParentId = [{ _id: new ObjectID(), events: [events[0]] }];

    getEventsGroupedByParentIdStub.returns(eventsGroupedByParentId);

    await EventHelper.deleteList(customerId, startDate, endDate, credentials);
    sinon.assert.calledWithExactly(deleteEventsStub, eventsGroupedByParentId[0].events, credentials);
    sinon.assert.calledWithExactly(getEventsGroupedByParentIdStub, query);
    sinon.assert.notCalled(deleteRepetitionStub);
  });

  it('should delete all events and repetition as of start date', async () => {
    const startDate = '2019-10-07';
    const query = { customer: customerId, startDate: { $gte: moment('2019-10-07').toDate() } };
    const repetitionParentId = new ObjectID();
    const events = [
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'internal_hour',
        repetition: { frequency: NEVER },
        startDate: '2019-10-12T10:00:00.000Z',
        endDate: '2019-10-12T12:00:00.000Z',
        auxiliary: userId,
      },
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'unavailability',
        repetition: { frequency: EVERY_WEEK, parentId: repetitionParentId },
        startDate: '2019-10-09T11:00:00.000Z',
        endDate: '2019-10-09T13:00:00.000Z',
        auxiliary: userId,
      },
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'unavailability',
        repetition: { frequency: NEVER, parentId: repetitionParentId },
        startDate: '2019-10-7T11:30:00.000Z',
        endDate: '2019-10-7T13:00:00.000Z',
        auxiliary: userId,
      },
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'unavailability',
        startDate: '2019-10-20T11:00:00.000Z',
        endDate: '2019-10-20T13:00:00.000Z',
        auxiliary: userId,
      },
    ];
    EventModel.expects('countDocuments')
      .withExactArgs({ ...query, isBilled: true })
      .once()
      .returns(0);

    const eventsGroupedByParentId = [
      { _id: null, events: [events[0]] },
      { _id: repetitionParentId, events: [events[1], events[2]] },
    ];
    getEventsGroupedByParentIdStub.returns(eventsGroupedByParentId);

    await EventHelper.deleteList(customerId, startDate, undefined, credentials);
    sinon.assert.calledWithExactly(deleteEventsStub, eventsGroupedByParentId[0].events, credentials);
    sinon.assert.calledWithExactly(getEventsGroupedByParentIdStub, query);
    sinon.assert.calledWithExactly(deleteRepetitionStub, eventsGroupedByParentId[1].events[0], credentials);
  });

  it('should delete all events and repetition even if repetition frequency is NEVER', async () => {
    const startDate = '2019-10-07';
    const query = { customer: customerId, startDate: { $gte: moment('2019-10-07').toDate() } };
    const repetitionParentId = new ObjectID();
    const events = [
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'unavailability',
        repetition: { frequency: NEVER, parentId: repetitionParentId },
        startDate: '2019-10-09T11:00:00.000Z',
        endDate: '2019-10-09T13:00:00.000Z',
        auxiliary: userId,
      },
      {
        _id: new ObjectID(),
        customer: customerId,
        type: 'unavailability',
        repetition: { frequency: NEVER, parentId: repetitionParentId },
        startDate: '2019-10-7T11:30:00.000Z',
        endDate: '2019-10-7T13:00:00.000Z',
        auxiliary: userId,
      },
    ];
    EventModel.expects('countDocuments')
      .withExactArgs({ ...query, isBilled: true })
      .once()
      .returns(0);

    const eventsGroupedByParentId = [
      { _id: repetitionParentId, events: [events[0], events[1]] },
    ];
    getEventsGroupedByParentIdStub.returns(eventsGroupedByParentId);

    await EventHelper.deleteList(customerId, startDate, undefined, credentials);
    sinon.assert.notCalled(deleteEventsStub);
    sinon.assert.calledWithExactly(getEventsGroupedByParentIdStub, query);
    sinon.assert.calledWithExactly(
      deleteRepetitionStub,
      { ...eventsGroupedByParentId[0].events[0], repetition: { frequency: EVERY_WEEK, parentId: eventsGroupedByParentId[0].events[0].repetition.parentId } },
      credentials
    );
  });
});

describe('updateAbsencesOnContractEnd', () => {
  let getAbsences = null;
  let createEventHistoryOnUpdate = null;
  let updateMany = null;

  const customerId = new ObjectID();
  const userId = new ObjectID();
  const credentials = { _id: userId };

  const absences = [
    {
      _id: new ObjectID(),
      type: 'absences',
      startDate: '2019-10-02T10:00:00.000Z',
      endDate: '2019-10-04T12:00:00.000Z',
      auxiliary: userId,
    },
  ];

  beforeEach(() => {
    getAbsences = sinon.stub(EventRepository, 'getAbsences');
    createEventHistoryOnUpdate = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnUpdate');
    updateMany = sinon.stub(Event, 'updateMany');
  });
  afterEach(() => {
    getAbsences.restore();
    createEventHistoryOnUpdate.restore();
    updateMany.restore();
  });

  it('should update future absences events linked to company contract', async () => {
    const contract = { status: COMPANY_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId };
    const maxEndDate = moment(contract.endDate).hour(22).startOf('h');
    getAbsences.returns(absences);

    await EventHelper.updateAbsencesOnContractEnd(userId, contract.endDate, credentials);
    sinon.assert.calledWith(getAbsences, userId, maxEndDate);
    sinon.assert.calledOnce(createEventHistoryOnUpdate);
    sinon.assert.calledWith(updateMany, { _id: { $in: [absences[0]._id] } }, { $set: { endDate: maxEndDate } });
  });

  it('should update future absences events linked to corresponding customer contract', async () => {
    const contract = { status: CUSTOMER_CONTRACT, endDate: '2019-10-02T08:00:00.000Z', user: userId, customer: customerId };
    const maxEndDate = moment(contract.endDate).hour(22).startOf('h');
    getAbsences.returns(absences);

    await EventHelper.updateAbsencesOnContractEnd(userId, contract.endDate, credentials);
    sinon.assert.calledWith(getAbsences, userId, maxEndDate);
    sinon.assert.calledOnce(createEventHistoryOnUpdate);
    sinon.assert.calledWith(updateMany, { _id: { $in: [absences[0]._id] } }, { $set: { endDate: maxEndDate } });
  });
});

describe('createEvent', () => {
  let createMock;
  let isCreationAllowed;
  let hasConflicts;
  let createEventHistoryOnCreate;
  let populateEventSubscription;
  let createRepetitions;
  let getEvent;
  let deleteConflictInternalHoursAndUnavailabilities;
  let unassignConflictInterventions;
  const credentials = { _id: 'qwertyuiop', company: { _id: new ObjectID() } };
  beforeEach(() => {
    createMock = sinon.mock(Event);
    isCreationAllowed = sinon.stub(EventsValidationHelper, 'isCreationAllowed');
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    createEventHistoryOnCreate = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnCreate');
    populateEventSubscription = sinon.stub(EventHelper, 'populateEventSubscription');
    createRepetitions = sinon.stub(EventsRepetitionHelper, 'createRepetitions');
    getEvent = sinon.stub(EventRepository, 'getEvent');
    deleteConflictInternalHoursAndUnavailabilities = sinon.stub(EventHelper, 'deleteConflictInternalHoursAndUnavailabilities');
    unassignConflictInterventions = sinon.stub(EventHelper, 'unassignConflictInterventions');
  });
  afterEach(() => {
    createMock.restore();
    isCreationAllowed.restore();
    hasConflicts.restore();
    createEventHistoryOnCreate.restore();
    populateEventSubscription.restore();
    createRepetitions.restore();
    getEvent.restore();
    deleteConflictInternalHoursAndUnavailabilities.restore();
    unassignConflictInterventions.restore();
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
    const newEvent = new Event({ type: INTERNAL_HOUR, company: new ObjectID() });

    isCreationAllowed.returns(true);
    getEvent.returns(newEvent);
    createMock.expects('create').returns(newEvent);

    await EventHelper.createEvent({}, credentials);

    sinon.assert.called(createEventHistoryOnCreate);
    createMock.verify();
    sinon.assert.calledWithExactly(getEvent, newEvent._id, credentials);
    sinon.assert.notCalled(createRepetitions);
    sinon.assert.called(populateEventSubscription);
  });

  it('should create repetitions as event is a repetition', async () => {
    const payload = { type: INTERVENTION, repetition: { frequency: EVERY_WEEK }, company: new ObjectID() };
    const newEvent = new Event(payload);

    isCreationAllowed.returns(true);
    hasConflicts.returns(false);
    createMock.expects('create').returns(newEvent);
    getEvent.returns(newEvent);

    await EventHelper.createEvent(payload, credentials);

    sinon.assert.called(createEventHistoryOnCreate);
    createMock.verify();
    sinon.assert.calledWithExactly(getEvent, newEvent._id, credentials);
    sinon.assert.called(createRepetitions);
    sinon.assert.called(populateEventSubscription);
  });

  it('should unassign intervention and delete other event in conflict on absence creation', async () => {
    const eventId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      type: ABSENCE,
      startDate: '2019-03-20T10:00:00',
      endDate: '2019-03-20T12:00:00',
      auxiliary: auxiliaryId.toHexString(),
      _id: eventId.toHexString(),
      company: new ObjectID(),
    };
    const newEvent = new Event({ ...payload, auxiliary: { _id: auxiliaryId } });

    isCreationAllowed.returns(true);
    createMock.expects('create').returns(newEvent);
    getEvent.returns(newEvent);

    await EventHelper.createEvent(payload, credentials);

    sinon.assert.calledWithExactly(
      deleteConflictInternalHoursAndUnavailabilities,
      { startDate: new Date('2019-03-20T10:00:00'), endDate: new Date('2019-03-20T12:00:00') },
      auxiliaryId.toHexString(),
      eventId.toHexString(),
      credentials
    );
    sinon.assert.calledWithExactly(
      unassignConflictInterventions,
      { startDate: new Date('2019-03-20T10:00:00'), endDate: new Date('2019-03-20T12:00:00') },
      auxiliaryId.toHexString(),
      credentials
    );
  });
});

describe('deleteConflictInternalHoursAndUnavailabilities', () => {
  const dates = { startDate: '2019-03-20T10:00:00', endDate: '2019-03-20T12:00:00' };
  const auxiliaryId = new ObjectID();
  const absenceId = new ObjectID();
  const credentials = { _id: new ObjectID() };
  let getEventsInConflicts;
  let deleteEvents;
  beforeEach(() => {
    getEventsInConflicts = sinon.stub(EventRepository, 'getEventsInConflicts');
    deleteEvents = sinon.stub(EventHelper, 'deleteEvents');
  });
  afterEach(() => {
    getEventsInConflicts.restore();
    deleteEvents.restore();
  });

  it('should delete conflict events except interventions', async () => {
    const events = [new Event({ _id: new ObjectID() }), new Event({ _id: new ObjectID() })];
    getEventsInConflicts.returns(events);
    await EventHelper.deleteConflictInternalHoursAndUnavailabilities(dates, auxiliaryId, absenceId, credentials);

    getEventsInConflicts.calledWithExactly(dates, auxiliaryId, [INTERNAL_HOUR, ABSENCE, UNAVAILABILITY], absenceId);
    sinon.assert.calledWithExactly(deleteEvents, events, credentials);
  });
});

describe('unassignConflictInterventions', () => {
  const dates = { startDate: '2019-03-20T10:00:00', endDate: '2019-03-20T12:00:00' };
  const auxiliaryId = new ObjectID();
  const credentials = { _id: new ObjectID() };
  let getEventsInConflicts;
  let updateEvent;
  beforeEach(() => {
    getEventsInConflicts = sinon.stub(EventRepository, 'getEventsInConflicts');
    updateEvent = sinon.stub(EventHelper, 'updateEvent');
  });
  afterEach(() => {
    getEventsInConflicts.restore();
    updateEvent.restore();
  });

  it('should delete conflict events except interventions', async () => {
    const events = [new Event({ _id: new ObjectID() }), new Event({ _id: new ObjectID() })];
    getEventsInConflicts.returns(events);
    await EventHelper.unassignConflictInterventions(dates, auxiliaryId, credentials);

    getEventsInConflicts.calledWith(dates, auxiliaryId, [INTERVENTION]);
    sinon.assert.callCount(updateEvent, events.length);
  });
});

describe('deleteEvent', () => {
  let createEventHistoryOnDelete;
  let deleteOne;
  const credentials = { _id: (new ObjectID()).toHexString() };
  beforeEach(() => {
    createEventHistoryOnDelete = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnDelete');
    deleteOne = sinon.stub(Event, 'deleteOne');
  });
  afterEach(() => {
    createEventHistoryOnDelete.restore();
    deleteOne.restore();
  });

  it('should delete repetition', async () => {
    const parentId = new ObjectID();
    const deletionInfo = {
      _id: new ObjectID(),
      type: INTERVENTION,
      startDate: '2019-01-21T09:38:18',
    };
    const event = {
      ...deletionInfo,
      repetition: {
        frequency: EVERY_WEEK,
        parentId,
      },
    };
    const result = await EventHelper.deleteEvent(event, credentials);

    expect(result).toEqual(event);
    sinon.assert.calledWith(createEventHistoryOnDelete, deletionInfo, credentials);
    sinon.assert.calledWith(deleteOne, { _id: event._id });
  });

  it('should not delete event if it is billed', async () => {
    try {
      const event = {
        _id: new ObjectID(),
        type: INTERVENTION,
        isBilled: true,
        startDate: '2019-01-21T09:38:18',
      };
      const result = await EventHelper.deleteEvent(event, credentials);
      expect(result).toBe(undefined);
    } catch (e) {
      expect(e).toEqual(Boom.forbidden('The event is already billed'));
    }
  });
});

describe('deleteEvents', () => {
  let createEventHistoryOnDelete;
  let deleteMany;
  const credentials = { _id: (new ObjectID()).toHexString() };
  beforeEach(() => {
    createEventHistoryOnDelete = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnDelete');
    deleteMany = sinon.stub(Event, 'deleteMany');
  });
  afterEach(() => {
    createEventHistoryOnDelete.restore();
    deleteMany.restore();
  });

  it('should delete events', async () => {
    const events = [
      { _id: '1234567890' },
      { _id: 'qwertyuiop' },
      { _id: 'asdfghjkl' },
    ];
    await EventHelper.deleteEvents(events, credentials);

    sinon.assert.callCount(createEventHistoryOnDelete, events.length);
    sinon.assert.calledWith(deleteMany, { _id: { $in: ['1234567890', 'qwertyuiop', 'asdfghjkl'] } });
  });

  it('should not delete event if at least one is billed', async () => {
    try {
      const events = [
        { _id: '1234567890', type: INTERVENTION, isBilled: true },
        { _id: 'qwertyuiop', type: INTERVENTION, isBilled: false },
        { _id: 'asdfghjkl', type: INTERVENTION, isBilled: false },
      ];
      await EventHelper.deleteEvents(events, credentials);
      sinon.assert.notCalled(deleteMany);
    } catch (e) {
      expect(e).toEqual(Boom.forbidden('Some events are already billed'));
    }
  });
});

describe('isMiscOnlyUpdated', () => {
  it('should return true if event misc field is the only one being updated (assigned intervention)', () => {
    const event = {
      status: INTERVENTION,
      sector: new ObjectID(),
      auxiliary: new ObjectID(),
      subscription: new ObjectID(),
      startDate: '2019-01-21T09:30:00',
      endDate: '2019-01-21T11:30:00',
      isCancelled: false,
    };
    const updatedEventPayload = {
      ...event,
      sector: event.sector.toHexString(),
      auxiliary: event.auxiliary.toHexString(),
      subscription: event.subscription.toHexString(),
      misc: 'Test',
    };

    expect(EventHelper.isMiscOnlyUpdated(event, updatedEventPayload)).toBeTruthy();
  });

  it('should return true if event misc field is the only one being updated (unassigned intervention)', () => {
    const event = {
      status: INTERVENTION,
      sector: new ObjectID(),
      subscription: new ObjectID(),
      startDate: '2019-01-21T09:30:00',
      endDate: '2019-01-21T11:30:00',
      isCancelled: false,
      misc: 'Test',
    };
    const updatedEventPayload = {
      ...event,
      sector: event.sector.toHexString(),
      subscription: event.subscription.toHexString(),
      misc: '',
    };

    expect(EventHelper.isMiscOnlyUpdated(event, updatedEventPayload)).toBeTruthy();
  });

  it('should return true if event misc field is the only one being updated (unavailability)', () => {
    const event = {
      status: UNAVAILABILITY,
      sector: new ObjectID(),
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:30:00',
      endDate: '2019-01-21T11:30:00',
      isCancelled: false,
      misc: '',
    };
    const updatedEventPayload = {
      ...event,
      sector: event.sector.toHexString(),
      auxiliary: event.auxiliary.toHexString(),
      misc: 'Test',
    };

    expect(EventHelper.isMiscOnlyUpdated(event, updatedEventPayload)).toBeTruthy();
  });

  it('should return false if event misc field is not the only one being updated (assigned intervention)', () => {
    const event = {
      status: INTERVENTION,
      sector: new ObjectID(),
      auxiliary: new ObjectID(),
      subscription: new ObjectID(),
      startDate: '2019-01-21T09:30:00',
      endDate: '2019-01-21T11:30:00',
      isCancelled: false,
    };
    const updatedEventPayload = {
      ...event,
      sector: event.sector.toHexString(),
      auxiliary: new ObjectID().toHexString(),
      subscription: event.subscription.toHexString(),
      misc: 'Test',
    };

    expect(EventHelper.isMiscOnlyUpdated(event, updatedEventPayload)).toBeFalsy();
  });

  it('should return false if event misc field is not the only one being updated (unassigned intervention)', () => {
    const event = {
      status: INTERVENTION,
      sector: new ObjectID(),
      subscription: new ObjectID(),
      startDate: '2019-01-21T09:30:00',
      endDate: '2019-01-21T11:30:00',
      isCancelled: false,
      misc: 'Test',
    };
    const updatedEventPayload = {
      ...event,
      sector: new ObjectID().toHexString(),
      subscription: event.subscription.toHexString(),
      misc: '',
    };

    expect(EventHelper.isMiscOnlyUpdated(event, updatedEventPayload)).toBeFalsy();
  });

  it('should return false if event misc field is not the only one being updated (unavailability)', () => {
    const event = {
      status: UNAVAILABILITY,
      sector: new ObjectID(),
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:30:00',
      endDate: '2019-01-21T11:30:00',
      isCancelled: false,
      misc: '',
    };
    const updatedEventPayload = {
      ...event,
      startDate: '2019-01-22T09:30:00',
      endDate: '2019-01-22T11:30:00',
      sector: event.sector.toHexString(),
      auxiliary: event.auxiliary.toHexString(),
      misc: 'Test',
    };

    expect(EventHelper.isMiscOnlyUpdated(event, updatedEventPayload)).toBeFalsy();
  });
});

describe('updateEventsInternalHourType', () => {
  let updateMany;
  beforeEach(() => {
    updateMany = sinon.stub(Event, 'updateMany');
  });
  afterEach(() => {
    updateMany.restore();
  });

  it('should update internal hours events', async () => {
    const internalHour = { _id: new ObjectID() };
    const defaultInternalHourId = new ObjectID();
    const eventsStartDate = '2019-01-21T09:30:00';

    await EventHelper.updateEventsInternalHourType(eventsStartDate, internalHour._id, defaultInternalHourId);

    sinon.assert.calledOnce(updateMany);
    sinon.assert.calledWith(
      updateMany,
      {
        type: INTERNAL_HOUR,
        internalHour: internalHour._id,
        startDate: { $gte: eventsStartDate },
      },
      { $set: { internalHour: defaultInternalHourId } }
    );
  });
});

describe('getContractWeekInfo', () => {
  let getDaysRatioBetweenTwoDates;
  let getContractInfo;
  let getMatchingVersionsList;
  beforeEach(() => {
    getDaysRatioBetweenTwoDates = sinon.stub(UtilsHelper, 'getDaysRatioBetweenTwoDates');
    getContractInfo = sinon.stub(ContractHelper, 'getContractInfo');
    getMatchingVersionsList = sinon.stub(ContractHelper, 'getMatchingVersionsList');
  });
  afterEach(() => {
    getDaysRatioBetweenTwoDates.restore();
    getContractInfo.restore();
    getMatchingVersionsList.restore();
  });

  it('should get contract week info', () => {
    const versions = [
      { startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
      { endDate: '', startDate: '2019-05-04', weeklyHours: 24 },
    ];
    const contract = { versions };
    const query = { startDate: '2019-11-20T00:00:00', endDate: '2019-11-22T00:00:00' };
    getDaysRatioBetweenTwoDates.returns(4);
    getContractInfo.returns({ contractHours: 26, workedDaysRatio: 1 / 4 });
    getMatchingVersionsList.returns(versions[1]);

    const result = EventHelper.getContractWeekInfo(contract, query);

    expect(result).toBeDefined();
    expect(result.contractHours).toBe(26);
    expect(result.workedDaysRatio).toBe(1 / 4);
    sinon.assert.calledWith(
      getDaysRatioBetweenTwoDates,
      moment('2019-11-20').startOf('w').toDate(),
      moment('2019-11-20').endOf('w').toDate()
    );
    sinon.assert.calledWith(getContractInfo, versions[1], query, 4);
  });
});
