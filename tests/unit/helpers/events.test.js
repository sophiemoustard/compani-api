const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const flat = require('flat');
const omit = require('lodash/omit');
const Event = require('../../../src/models/Event');
const Repetition = require('../../../src/models/Repetition');
const EventHelper = require('../../../src/helpers/events');
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

    sinon.assert.calledWith(updateEvent, eventId, payload);
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

    sinon.assert.calledWith(updateEvent, eventId, payload);
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

    sinon.assert.calledWith(updateEvent, eventId, payload);
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

    sinon.assert.calledWith(updateEvent, eventId, payload);
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

    sinon.assert.calledWith(
      updateEvent,
      eventId,
      { ...payload, isCancelled: false },
      { cancel: '' }
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
    sinon.assert.calledWith(
      updateEvent,
      eventId,
      { ...payload, isCancelled: false, 'repetition.frequency': NEVER },
      { cancel: '' }
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
  let save;
  let isCreationAllowed;
  let hasConflicts;
  let createEventHistoryOnCreate;
  let populateEventSubscription;
  let createRepetitions;
  let getEvent;
  let deleteConflictInternalHoursAndUnavailabilities;
  let unassignConflictInterventions;
  beforeEach(() => {
    save = sinon.stub(Event.prototype, 'save');
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
    save.restore();
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
    const newEvent = new Event({ type: INTERNAL_HOUR });

    isCreationAllowed.returns(true);
    getEvent.returns(newEvent);

    await EventHelper.createEvent({}, {});

    sinon.assert.called(createEventHistoryOnCreate);
    sinon.assert.called(save);
    sinon.assert.calledWith(getEvent);
    sinon.assert.notCalled(createRepetitions);
    sinon.assert.called(populateEventSubscription);
  });

  it('should create repetitions as event is a repetition', async () => {
    const payload = { type: INTERVENTION, repetition: { frequency: EVERY_WEEK } };
    const newEvent = new Event(payload);

    isCreationAllowed.returns(true);
    hasConflicts.returns(false);
    getEvent.returns(newEvent);

    await EventHelper.createEvent(payload, {});

    sinon.assert.called(createEventHistoryOnCreate);
    sinon.assert.called(save);
    sinon.assert.called(getEvent);
    sinon.assert.called(createRepetitions);
    sinon.assert.called(populateEventSubscription);
  });

  it('should unassign intervention and delete other event in conflict on absence creation', async () => {
    const eventId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const credentials = { _id: 'asdfghjkl' };
    const payload = {
      type: ABSENCE,
      startDate: '2019-03-20T10:00:00',
      endDate: '2019-03-20T12:00:00',
      auxiliary: auxiliaryId.toHexString(),
      _id: eventId.toHexString(),
    };
    const newEvent = new Event({ ...payload, auxiliary: { _id: auxiliaryId } });

    isCreationAllowed.returns(true);
    getEvent.returns(newEvent);

    await EventHelper.createEvent(payload, credentials);

    sinon.assert.calledWith(
      deleteConflictInternalHoursAndUnavailabilities,
      { startDate: new Date('2019-03-20T10:00:00'), endDate: new Date('2019-03-20T12:00:00') },
      auxiliaryId.toHexString(),
      eventId.toHexString(),
      { _id: 'asdfghjkl' }
    );
    sinon.assert.calledWith(
      unassignConflictInterventions,
      { startDate: new Date('2019-03-20T10:00:00'), endDate: new Date('2019-03-20T12:00:00') },
      auxiliaryId.toHexString(),
      { _id: 'asdfghjkl' }
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

    getEventsInConflicts.calledWith(dates, auxiliaryId, [INTERNAL_HOUR, ABSENCE, UNAVAILABILITY], absenceId);
    sinon.assert.calledWith(deleteEvents, events, credentials);
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
});

describe('updateEventsInternalHourType', () => {
  it('should update internal hours events', async () => {
    const internalHour = { _id: new ObjectID() };
    const defaultInternalHour = { _id: new ObjectID(), name: 'Default', default: true };
    const updateManyMock = sinon.mock(Event);
    const eventsStartDate = '2019-01-21T09:30:00';

    updateManyMock
      .expects('updateMany')
      .withArgs(
        {
          type: INTERNAL_HOUR,
          'internalHour._id': internalHour._id,
          startDate: { $gte: eventsStartDate },
        },
        { $set: flat({ internalHour: omit(defaultInternalHour, '_id') }) }
      );

    await EventHelper.updateEventsInternalHourType('2019-01-21T09:30:00', internalHour._id, defaultInternalHour);

    updateManyMock.verify();
    updateManyMock.restore();
  });
});
