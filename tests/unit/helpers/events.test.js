const expect = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const Boom = require('@hapi/boom');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const Repetition = require('../../../src/models/Repetition');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const EventHelper = require('../../../src/helpers/events');
const DistanceMatrixHelper = require('../../../src/helpers/distanceMatrix');
const ContractHelper = require('../../../src/helpers/contracts');
const UtilsHelper = require('../../../src/helpers/utils');
const EventsRepetitionHelper = require('../../../src/helpers/eventsRepetition');
const EventHistoriesHelper = require('../../../src/helpers/eventHistories');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const EventRepository = require('../../../src/repositories/EventRepository');
const {
  INTERVENTION,
  AUXILIARY_INITIATIVE,
  INTERNAL_HOUR,
  ABSENCE,
  UNAVAILABILITY,
  NEVER,
  EVERY_WEEK,
  AUXILIARY,
  CUSTOMER,
  PLANNING_VIEW_END_HOUR,
} = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

require('sinon-mongoose');

describe('list', () => {
  let getEventsGroupedByCustomersStub;
  let getEventsGroupedByAuxiliariesStub;
  let populateEventsStub;
  let getEventListStub;
  let getListQueryStub;

  beforeEach(() => {
    getEventsGroupedByCustomersStub = sinon.stub(EventRepository, 'getEventsGroupedByCustomers');
    getEventsGroupedByAuxiliariesStub = sinon.stub(EventRepository, 'getEventsGroupedByAuxiliaries');
    populateEventsStub = sinon.stub(EventHelper, 'populateEvents');
    getEventListStub = sinon.stub(EventRepository, 'getEventList');
    getListQueryStub = sinon.stub(EventHelper, 'getListQuery');
  });

  afterEach(() => {
    getEventsGroupedByCustomersStub.restore();
    getEventsGroupedByAuxiliariesStub.restore();
    populateEventsStub.restore();
    getEventListStub.restore();
    getListQueryStub.restore();
  });
  const companyId = new ObjectID();
  const credentials = { company: { _id: companyId } };

  it('should list events grouped by customer', async () => {
    const query = { groupBy: CUSTOMER };
    const eventsQuery = {};
    getListQueryStub.returns(eventsQuery);
    const events = [{ type: 'intervention' }];
    getEventsGroupedByCustomersStub.returns(events);

    const result = await EventHelper.list(query, credentials);

    expect(result).toEqual(events);
    sinon.assert.calledWithExactly(getEventsGroupedByCustomersStub, eventsQuery, companyId);
    sinon.assert.notCalled(getEventsGroupedByAuxiliariesStub);
    sinon.assert.notCalled(getEventListStub);
    sinon.assert.notCalled(populateEventsStub);
  });

  it('should list events grouped by auxiliary', async () => {
    const query = { groupBy: AUXILIARY };
    const eventsQuery = {};
    getListQueryStub.returns(eventsQuery);
    const events = [{ type: 'intervention' }];
    getEventsGroupedByAuxiliariesStub.returns(events);

    const result = await EventHelper.list(query, credentials);

    expect(result).toEqual(events);
    sinon.assert.notCalled(getEventsGroupedByCustomersStub);
    sinon.assert.calledWithExactly(getEventsGroupedByAuxiliariesStub, eventsQuery, companyId);
    sinon.assert.notCalled(getEventListStub);
    sinon.assert.notCalled(populateEventsStub);
  });

  it('should list events', async () => {
    const query = {};
    const eventsQuery = {};
    getListQueryStub.returns(eventsQuery);
    const events = [{ type: 'intervention' }];
    getEventListStub.returns(events);
    const populatedEvents = [{ type: 'intervention', customer: new ObjectID() }];
    populateEventsStub.returns(populatedEvents);

    const result = await EventHelper.list(query, credentials);

    expect(result).toEqual(populatedEvents);
    sinon.assert.notCalled(getEventsGroupedByAuxiliariesStub);
    sinon.assert.notCalled(getEventsGroupedByCustomersStub);
    sinon.assert.calledWithExactly(getEventListStub, eventsQuery, companyId);
    sinon.assert.calledWithExactly(populateEventsStub, events);
  });
});

describe('isRepetition', () => {
  it('should return true if event is repetition with frequency not never', () => {
    const res = EventHelper.isRepetition({ repetition: { frequency: 'every_week' } });
    expect(res).toBe(true);
  });

  it('should return false if event is repetition with frequency never', () => {
    const res = EventHelper.isRepetition({ repetition: { frequency: 'never' } });
    expect(res).toBe(false);
  });

  it('should return false if event is repetition without frequency', () => {
    const res = EventHelper.isRepetition({ repetition: { id: '123' } });
    expect(res).toBe(false);
  });

  it('should return false if event is not a repetition', () => {
    const res = EventHelper.isRepetition({ repetition: { id: '123' } });
    expect(res).toBe(false);
  });
});

describe('formatEditionPayload', () => {
  it('Case 1: event is detached from repetition', () => {
    const payload = { startDate: '2019-01-10T10:00:00', sector: new ObjectID(), misc: 'lalalal' };
    const event = { repetition: { frequency: EVERY_WEEK } };

    const result = EventHelper.formatEditionPayload(event, payload, true);

    expect(result).toEqual({ $set: { ...payload, 'repetition.frequency': NEVER }, $unset: { auxiliary: '' } });
  });

  it('Case 2: event is not detached from repetition', () => {
    const payload = { misc: 'lalala' };
    const event = { repetition: { frequency: EVERY_WEEK } };

    const result = EventHelper.formatEditionPayload(event, payload, false);

    expect(result).toEqual({ $set: payload, $unset: { auxiliary: '' } });
  });

  it('Case 4: auxiliary is in payload', () => {
    const payload = { startDate: '2019-01-10T10:00:00', auxiliary: new ObjectID() };
    const event = {};

    const result = EventHelper.formatEditionPayload(event, payload, false);

    expect(result).toEqual({ $set: payload, $unset: { sector: '' } });
  });
  it('Case 5: remove cancellation', () => {
    const payload = { isCancelled: false, startDate: '2019-01-10T10:00:00', sector: new ObjectID() };
    const event = { isCancelled: true, cancel: { reason: AUXILIARY_INITIATIVE } };

    const result = EventHelper.formatEditionPayload(event, payload, false);

    expect(result).toEqual({ $set: { ...payload, isCancelled: false }, $unset: { auxiliary: '', cancel: '' } });
  });
  it('Case 5: remove address', () => {
    const auxiliary = new ObjectID();
    const payload = { address: {}, auxiliary };
    const event = { auxiliary };

    const result = EventHelper.formatEditionPayload(event, payload, false);

    expect(result).toEqual({ $set: payload, $unset: { address: '', sector: '' } });
  });
});

describe('updateEvent', () => {
  let createEventHistoryOnUpdate;
  let updateRepetition;
  let formatEditionPayload;
  let EventMock;
  let deleteConflictInternalHoursAndUnavailabilities;
  let unassignConflictInterventions;
  let populateEventSubscription;
  let isUpdateAllowed;
  let isMiscOnlyUpdated;
  let isRepetition;

  beforeEach(() => {
    createEventHistoryOnUpdate = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnUpdate');
    populateEventSubscription = sinon.stub(EventHelper, 'populateEventSubscription');
    updateRepetition = sinon.stub(EventsRepetitionHelper, 'updateRepetition');
    EventMock = sinon.mock(Event);
    deleteConflictInternalHoursAndUnavailabilities = sinon.stub(
      EventHelper,
      'deleteConflictInternalHoursAndUnavailabilities'
    );
    unassignConflictInterventions = sinon.stub(EventHelper, 'unassignConflictInterventions');
    formatEditionPayload = sinon.stub(EventHelper, 'formatEditionPayload');
    isUpdateAllowed = sinon.stub(EventsValidationHelper, 'isUpdateAllowed');
    isMiscOnlyUpdated = sinon.stub(EventHelper, 'isMiscOnlyUpdated');
    isRepetition = sinon.stub(EventHelper, 'isRepetition');
  });
  afterEach(() => {
    createEventHistoryOnUpdate.restore();
    populateEventSubscription.restore();
    updateRepetition.restore();
    EventMock.restore();
    deleteConflictInternalHoursAndUnavailabilities.restore();
    unassignConflictInterventions.restore();
    formatEditionPayload.restore();
    isUpdateAllowed.restore();
    isMiscOnlyUpdated.restore();
    isRepetition.restore();
  });

  it('should update repetition', async () => {
    const companyId = new ObjectID();
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
    const eventId = new ObjectID();
    const auxiliary = new ObjectID();
    const event = { _id: eventId, type: INTERVENTION, auxiliary, repetition: { frequency: 'every_week' } };
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T10:38:18',
      auxiliary: auxiliary.toHexString(),
      shouldUpdateRepetition: true,
    };

    isUpdateAllowed.returns(true);
    EventMock.expects('updateOne').never();
    EventMock.expects('findOne')
      .withExactArgs({ _id: event._id })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity administrative.driveFolder administrative.transportInvoice company picture',
        populate: { path: 'sector', select: '_id sector', match: { company: companyId } },
      })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: 'identity subscriptions contact' })
      .chain('populate')
      .withExactArgs({ path: 'internalHour', match: { company: companyId } })
      .chain('lean')
      .once()
      .returns(event);

    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.calledOnceWithExactly(updateRepetition, event, payload, credentials);
    sinon.assert.notCalled(isRepetition);
    EventMock.verify();
  });

  it('should update event', async () => {
    const companyId = new ObjectID();
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
    const eventId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const event = { _id: eventId, type: INTERVENTION, auxiliary: { _id: auxiliaryId } };
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T12:38:18',
      auxiliary: auxiliaryId.toHexString(),
      misc: 'test',
    };

    isUpdateAllowed.returns(true);
    isMiscOnlyUpdated.returns(false);
    isRepetition.returns(false);
    formatEditionPayload.returns({ $set: {}, unset: {} });
    EventMock.expects('updateOne').withExactArgs({ _id: event._id }, { $set: {}, unset: {} }).once();
    EventMock.expects('findOne')
      .withExactArgs({ _id: event._id })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity administrative.driveFolder administrative.transportInvoice company picture',
        populate: { path: 'sector', select: '_id sector', match: { company: companyId } },
      })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: 'identity subscriptions contact' })
      .chain('populate')
      .withExactArgs({ path: 'internalHour', match: { company: companyId } })
      .chain('lean')
      .once()
      .returns({ ...event, updated: 1 });

    await EventHelper.updateEvent(event, payload, credentials);

    EventMock.verify();
    sinon.assert.calledOnceWithExactly(populateEventSubscription, { ...event, updated: 1 });
    sinon.assert.calledOnceWithExactly(formatEditionPayload, event, payload, false);
    sinon.assert.calledOnceWithExactly(isUpdateAllowed, event, payload, credentials);
    sinon.assert.calledOnceWithExactly(isRepetition, event);
    sinon.assert.calledOnceWithExactly(isMiscOnlyUpdated, event, payload);
    sinon.assert.notCalled(deleteConflictInternalHoursAndUnavailabilities);
    sinon.assert.notCalled(unassignConflictInterventions);
    sinon.assert.notCalled(updateRepetition);
  });

  it('should update event when misc is updated among other fields and event is a repetition', async () => {
    const companyId = new ObjectID();
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
    const eventId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const event = { _id: eventId, type: ABSENCE, auxiliary: { _id: auxiliaryId } };
    const payload = { startDate: '2019-01-21T09:38:18', auxiliary: auxiliaryId.toHexString(), misc: '123' };

    isUpdateAllowed.returns(true);
    isMiscOnlyUpdated.returns(false);
    isRepetition.returns(true);
    formatEditionPayload.returns({ $set: {}, unset: {} });
    EventMock.expects('updateOne').withExactArgs({ _id: event._id }, { $set: {}, unset: {} }).once();
    EventMock.expects('findOne')
      .withExactArgs({ _id: event._id })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity administrative.driveFolder administrative.transportInvoice company picture',
        populate: { path: 'sector', select: '_id sector', match: { company: companyId } },
      })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: 'identity subscriptions contact' })
      .chain('populate')
      .withExactArgs({ path: 'internalHour', match: { company: companyId } })
      .chain('lean')
      .once()
      .returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    EventMock.verify();
    sinon.assert.calledOnceWithExactly(isMiscOnlyUpdated, event, payload);
    sinon.assert.calledOnceWithExactly(formatEditionPayload, event, payload, true);
  });

  it('should update event when misc is updated among other fields and event is not a repetition', async () => {
    const companyId = new ObjectID();
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
    const eventId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const event = { _id: eventId, type: ABSENCE, auxiliary: { _id: auxiliaryId } };
    const payload = { startDate: '2019-01-21T09:38:18', auxiliary: auxiliaryId.toHexString(), misc: '123' };

    isUpdateAllowed.returns(true);
    isMiscOnlyUpdated.returns(false);
    isRepetition.returns(false);
    formatEditionPayload.returns({ $set: {}, unset: {} });
    EventMock.expects('updateOne').withExactArgs({ _id: event._id }, { $set: {}, unset: {} }).once();
    EventMock.expects('findOne')
      .withExactArgs({ _id: event._id })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity administrative.driveFolder administrative.transportInvoice company picture',
        populate: { path: 'sector', select: '_id sector', match: { company: companyId } },
      })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: 'identity subscriptions contact' })
      .chain('populate')
      .withExactArgs({ path: 'internalHour', match: { company: companyId } })
      .chain('lean')
      .once()
      .returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    EventMock.verify();
    sinon.assert.calledOnceWithExactly(isMiscOnlyUpdated, event, payload);
    sinon.assert.calledOnceWithExactly(formatEditionPayload, event, payload, false);
  });

  it('should update event when only misc is updated', async () => {
    const companyId = new ObjectID();
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
    const eventId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const event = { _id: eventId, type: ABSENCE, auxiliary: { _id: auxiliaryId } };
    const payload = { misc: '123' };

    isUpdateAllowed.returns(true);
    isMiscOnlyUpdated.returns(true);
    isRepetition.returns(true);
    formatEditionPayload.returns({ $set: {}, unset: {} });
    EventMock.expects('updateOne').withExactArgs({ _id: event._id }, { $set: {}, unset: {} }).once();
    EventMock.expects('findOne')
      .withExactArgs({ _id: event._id })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity administrative.driveFolder administrative.transportInvoice company picture',
        populate: { path: 'sector', select: '_id sector', match: { company: companyId } },
      })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: 'identity subscriptions contact' })
      .chain('populate')
      .withExactArgs({ path: 'internalHour', match: { company: companyId } })
      .chain('lean')
      .once()
      .returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    EventMock.verify();
    sinon.assert.calledOnceWithExactly(isMiscOnlyUpdated, event, payload);
    sinon.assert.calledOnceWithExactly(formatEditionPayload, event, payload, false);
  });

  it('should update absence', async () => {
    const companyId = new ObjectID();
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
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

    isUpdateAllowed.returns(true);
    isMiscOnlyUpdated.returns(true);
    formatEditionPayload.returns({ $set: {}, unset: {} });
    EventMock.expects('updateOne').withExactArgs({ _id: event._id }, { $set: {}, unset: {} }).once();
    EventMock.expects('findOne')
      .withExactArgs({ _id: event._id })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity administrative.driveFolder administrative.transportInvoice company picture',
        populate: { path: 'sector', select: '_id sector', match: { company: companyId } },
      })
      .chain('populate')
      .withExactArgs({ path: 'customer', select: 'identity subscriptions contact' })
      .chain('populate')
      .withExactArgs({ path: 'internalHour', match: { company: companyId } })
      .chain('lean')
      .once()
      .returns(event);
    await EventHelper.updateEvent(event, payload, credentials);

    sinon.assert.calledWithExactly(
      unassignConflictInterventions,
      { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' },
      event.auxiliary,
      credentials
    );
    sinon.assert.calledWithExactly(
      deleteConflictInternalHoursAndUnavailabilities,
      event,
      event.auxiliary,
      credentials
    );
    sinon.assert.notCalled(isMiscOnlyUpdated);
    EventMock.verify();
  });

  it('should not update as event is scheduled on several days', async () => {
    const companyId = new ObjectID();
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
    const eventId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const event = { _id: eventId, type: INTERVENTION, auxiliary: { _id: auxiliaryId } };
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T10:38:18',
      auxiliary: auxiliaryId.toHexString(),
    };

    EventMock.expects('updateOne').never();

    try {
      await EventHelper.updateEvent(event, payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(400);
      expect(e.output.payload.message).toEqual('Les dates de début et de fin devraient être le même jour.');
    } finally {
      sinon.assert.notCalled(isUpdateAllowed);
      sinon.assert.notCalled(updateRepetition);
      sinon.assert.notCalled(createEventHistoryOnUpdate);
      sinon.assert.notCalled(isMiscOnlyUpdated);
      EventMock.verify();
    }
  });
});

describe('listForCreditNotes', () => {
  let EventModel;
  beforeEach(() => {
    EventModel = sinon.mock(Event);
  });
  afterEach(() => {
    EventModel.restore();
  });
  it('should return events with creditNotes', async () => {
    const events = [{
      type: 'intervention',
      isBilled: true,
    }];
    const companyId = new ObjectID();
    const payload = { customer: new ObjectID(), isBilled: true };
    const credentials = { company: { _id: companyId } };

    const query = {
      startDate: { $gte: moment(payload.startDate).startOf('d').toDate() },
      endDate: { $lte: moment(payload.endDate).endOf('d').toDate() },
      customer: payload.customer,
      isBilled: payload.isBilled,
      type: INTERVENTION,
      company: companyId,
      'bills.inclTaxesCustomer': { $exists: true, $gt: 0 },
      'bills.inclTaxesTpp': { $exists: false },
    };

    EventModel.expects('find')
      .withArgs(query)
      .chain('lean')
      .returns(events);

    const result = await EventHelper.listForCreditNotes(payload, credentials);
    expect(result).toBeDefined();
    expect(result).toBe(events);
  });

  it('should query with thirdPartyPayer', async () => {
    const events = [{
      type: 'intervention',
      isBilled: true,
    }];
    const companyId = new ObjectID();
    const payload = { thirdPartyPayer: new ObjectID(), customer: new ObjectID(), isBilled: true };
    const credentials = { company: { _id: companyId } };

    const query = {
      startDate: { $gte: moment(payload.startDate).startOf('d').toDate() },
      endDate: { $lte: moment(payload.endDate).endOf('d').toDate() },
      customer: payload.customer,
      isBilled: payload.isBilled,
      type: INTERVENTION,
      company: companyId,
      'bills.thirdPartyPayer': payload.thirdPartyPayer,
    };

    EventModel.expects('find')
      .withArgs(query)
      .chain('lean')
      .returns(events);

    const result = await EventHelper.listForCreditNotes(payload, credentials);
    expect(result).toBeDefined();
    expect(result).toBe(events);
  });
});

describe('populateEventSubscription', () => {
  it('should populate subscription as event is an intervention', async () => {
    const subId = new ObjectID();
    const event = {
      type: 'intervention',
      customer: {
        subscriptions: [
          {
            createdAt: '2019-01-11T08:38:18.653Z',
            _id: subId,
            service: new ObjectID(),
            unitTTCRate: 25,
            estimatedWeeklyVolume: 12,
            sundays: 2,
          },
          {
            createdAt: '2019-01-21T09:38:18',
            _id: new ObjectID(),
            service: new ObjectID(),
            unitTTCRate: 25,
            estimatedWeeklyVolume: 12,
            sundays: 2,
          },
        ],
      },
      subscription: subId,
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
    expect(result.subscription).toBeUndefined();
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
            _id: new ObjectID(),
            service: new ObjectID(),
            unitTTCRate: 25,
            estimatedWeeklyVolume: 12,
            sundays: 2,
          },
        ],
      },
      subscription: new ObjectID(),
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
    const subIdList = [new ObjectID(), new ObjectID()];
    const events = [
      {
        type: 'intervention',
        customer: {
          subscriptions: [
            {
              createdAt: '2019-01-11T08:38:18.653Z',
              _id: subIdList[0],
              service: new ObjectID(),
              unitTTCRate: 25,
              estimatedWeeklyVolume: 12,
              sundays: 2,
            },
            {
              createdAt: '2019-01-21T09:38:18',
              _id: new ObjectID(),
              service: new ObjectID(),
              unitTTCRate: 25,
              estimatedWeeklyVolume: 12,
              sundays: 2,
            },
          ],
        },
        subscription: subIdList[0],
      },
      {
        type: 'intervention',
        customer: {
          subscriptions: [
            {
              createdAt: '2019-01-12T08:38:18.653Z',
              _id: subIdList,
              service: new ObjectID(),
              unitTTCRate: 25,
              estimatedWeeklyVolume: 12,
              sundays: 2,
            },
            {
              createdAt: '2019-01-22T09:38:18.653Z',
              _id: new ObjectID(),
              service: new ObjectID(),
              unitTTCRate: 25,
              estimatedWeeklyVolume: 12,
              sundays: 2,
            },
          ],
        },
        subscription: subIdList,
      },
    ];

    await EventHelper.populateEvents(events);
    sinon.assert.callCount(populateEventSubscription, events.length);
  });
});

describe('removeRepetitionsOnContractEnd', () => {
  let updateManyRepetition;
  let deleteManyRepetition;

  const userId = new ObjectID();
  const sectorId = new ObjectID();

  beforeEach(() => {
    updateManyRepetition = sinon.stub(Repetition, 'updateMany');
    deleteManyRepetition = sinon.stub(Repetition, 'deleteMany');
  });
  afterEach(() => {
    updateManyRepetition.restore();
    deleteManyRepetition.restore();
  });

  it('should unassigned repetition intervention and remove other repetitions', async () => {
    const contract = { endDate: '2019-10-02T08:00:00.000Z', user: { _id: userId, sector: sectorId } };

    await EventHelper.removeRepetitionsOnContractEnd(contract);
    sinon.assert.calledWithExactly(
      updateManyRepetition,
      { auxiliary: userId, type: 'intervention' }, { $unset: { auxiliary: '' }, $set: { sector: sectorId } }
    );
    sinon.assert.calledWithExactly(
      deleteManyRepetition,
      { auxiliary: userId, type: { $in: [UNAVAILABILITY, INTERNAL_HOUR] } }
    );
  });
});

describe('unassignInterventionsOnContractEnd', () => {
  let getInterventionsToUnassign;
  let createEventHistoryOnUpdate;
  let updateManyEvent;

  const userId = new ObjectID();
  const sectorId = new ObjectID();
  const companyId = new ObjectID();
  const credentials = { _id: userId, company: { _id: companyId } };

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
    getInterventionsToUnassign = sinon.stub(EventRepository, 'getInterventionsToUnassign');
    createEventHistoryOnUpdate = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnUpdate');
    updateManyEvent = sinon.stub(Event, 'updateMany');
  });
  afterEach(() => {
    getInterventionsToUnassign.restore();
    createEventHistoryOnUpdate.restore();
    updateManyEvent.restore();
  });

  it('should unassign future events linked to contract', async () => {
    const contract = { endDate: '2019-10-02T08:00:00.000Z', user: { _id: userId, sector: sectorId } };
    getInterventionsToUnassign.returns(interventions);

    await EventHelper.unassignInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWithExactly(
      getInterventionsToUnassign,
      contract.endDate,
      contract.user._id,
      companyId
    );
    sinon.assert.calledTwice(createEventHistoryOnUpdate);
    sinon.assert.calledWithExactly(
      updateManyEvent,
      { _id: { $in: [interventions[0].events[0]._id, interventions[1].events[0]._id] } },
      { $set: { 'repetition.frequency': NEVER, sector: sectorId }, $unset: { auxiliary: '' } }
    );
  });

  it('should create event history for repetition', async () => {
    const contract = { endDate: '2019-10-02T08:00:00.000Z', user: { _id: userId, sector: sectorId } };
    getInterventionsToUnassign.returns([interventions[1]]);

    await EventHelper.unassignInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWithExactly(
      createEventHistoryOnUpdate,
      {
        misc: 'toto',
        startDate: '2019-10-02T11:00:00.000Z',
        endDate: '2019-10-02T13:00:00.000Z',
        shouldUpdateRepetition: true,
      },
      interventions[1].events[0],
      credentials
    );
    sinon.assert.calledWithExactly(
      updateManyEvent,
      { _id: { $in: [interventions[1].events[0]._id] } },
      { $set: { 'repetition.frequency': NEVER, sector: sectorId }, $unset: { auxiliary: '' } }
    );
  });

  it('should create event history for non repeated event', async () => {
    const contract = { endDate: '2019-10-02T08:00:00.000Z', user: { _id: userId, sector: sectorId } };
    getInterventionsToUnassign.returns([interventions[0]]);

    await EventHelper.unassignInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWithExactly(
      createEventHistoryOnUpdate,
      { misc: undefined, startDate: '2019-10-02T10:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' },
      interventions[0].events[0],
      credentials
    );
    sinon.assert.calledWithExactly(
      updateManyEvent,
      { _id: { $in: [interventions[0].events[0]._id] } },
      { $set: { 'repetition.frequency': NEVER, sector: sectorId }, $unset: { auxiliary: '' } }
    );
  });
});

describe('removeEventsExceptInterventionsOnContractEnd', () => {
  let getEventsExceptInterventions;
  let createEventHistoryOnDelete;
  let deleteMany;
  const userId = new ObjectID();
  const sectorId = new ObjectID();
  const companyId = new ObjectID();
  const credentials = { _id: userId, company: { _id: companyId } };
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

  it('should remove future non-intervention events linked to contract', async () => {
    const contract = { endDate: '2019-10-02T08:00:00.000Z', user: { _id: userId, sector: sectorId } };
    getEventsExceptInterventions.returns(events);

    await EventHelper.removeEventsExceptInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWithExactly(getEventsExceptInterventions, '2019-10-02T08:00:00.000Z', userId, companyId);
    sinon.assert.calledTwice(createEventHistoryOnDelete);
    sinon.assert.calledWithExactly(deleteMany, { _id: { $in: [events[0].events[0]._id, events[1].events[0]._id] } });
  });

  it('should create event history for repetition', async () => {
    const contract = { endDate: '2019-10-02T08:00:00.000Z', user: { _id: userId, sector: sectorId } };
    getEventsExceptInterventions.returns([events[1]]);

    await EventHelper.removeEventsExceptInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWithExactly(createEventHistoryOnDelete, events[1].events[0], credentials);
    sinon.assert.calledWithExactly(deleteMany, { _id: { $in: [events[1].events[0]._id] } });
  });

  it('should create event history for non repeated event', async () => {
    const contract = { endDate: '2019-10-02T08:00:00.000Z', user: { _id: userId, sector: sectorId } };
    getEventsExceptInterventions.returns([events[0]]);

    await EventHelper.removeEventsExceptInterventionsOnContractEnd(contract, credentials);
    sinon.assert.calledWithExactly(createEventHistoryOnDelete, events[0].events[0], credentials);
    sinon.assert.calledWithExactly(deleteMany, { _id: { $in: [events[0].events[0]._id] } });
  });
});

describe('deleteList', () => {
  let deleteEventsStub;
  let deleteRepetitionStub;
  let EventModel;
  let getEventsGroupedByParentIdStub;
  const customerId = new ObjectID();
  const userId = new ObjectID();
  const credentials = { _id: userId, company: { _id: new ObjectID() } };

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
      .withExactArgs({ ...query, isBilled: true, company: credentials.company._id })
      .once()
      .returns(0);

    const eventsGroupedByParentId = [{ _id: new ObjectID(), events: [events[0]] }];

    getEventsGroupedByParentIdStub.returns(eventsGroupedByParentId);

    await EventHelper.deleteList(customerId, startDate, endDate, credentials);
    sinon.assert.calledWithExactly(deleteEventsStub, eventsGroupedByParentId[0].events, credentials);
    sinon.assert.calledWithExactly(getEventsGroupedByParentIdStub, query, credentials.company._id);
    sinon.assert.notCalled(deleteRepetitionStub);
  });

  it('should delete all events and repetition as of start date', async () => {
    const startDate = '2019-10-07';
    const query = {
      customer: customerId,
      startDate: { $gte: moment('2019-10-07').toDate() },
    };
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
      .withExactArgs({ ...query, isBilled: true, company: credentials.company._id })
      .once()
      .returns(0);

    const eventsGroupedByParentId = [
      { _id: null, events: [events[0]] },
      { _id: repetitionParentId, events: [events[1], events[2]] },
    ];
    getEventsGroupedByParentIdStub.returns(eventsGroupedByParentId);

    await EventHelper.deleteList(customerId, startDate, undefined, credentials);
    sinon.assert.calledWithExactly(deleteEventsStub, eventsGroupedByParentId[0].events, credentials);
    sinon.assert.calledWithExactly(getEventsGroupedByParentIdStub, query, credentials.company._id);
    sinon.assert.calledWithExactly(deleteRepetitionStub, eventsGroupedByParentId[1].events[0], credentials);
  });

  it('should delete all events and repetition even if repetition frequency is NEVER', async () => {
    const startDate = '2019-10-07';
    const query = {
      customer: customerId,
      startDate: { $gte: moment('2019-10-07').toDate() },
    };
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
      .withExactArgs({ ...query, isBilled: true, company: credentials.company._id })
      .once()
      .returns(0);

    const eventsGroupedByParentId = [
      { _id: repetitionParentId, events: [events[0], events[1]] },
    ];
    getEventsGroupedByParentIdStub.returns(eventsGroupedByParentId);

    await EventHelper.deleteList(customerId, startDate, undefined, credentials);
    sinon.assert.notCalled(deleteEventsStub);
    sinon.assert.calledWithExactly(getEventsGroupedByParentIdStub, query, credentials.company._id);
    sinon.assert.calledWithExactly(
      deleteRepetitionStub,
      {
        ...eventsGroupedByParentId[0].events[0],
        repetition: { frequency: EVERY_WEEK, parentId: eventsGroupedByParentId[0].events[0].repetition.parentId },
      },
      credentials
    );
  });
});

describe('updateAbsencesOnContractEnd', () => {
  let getAbsences = null;
  let createEventHistoryOnUpdate = null;
  let updateMany = null;

  const userId = new ObjectID();
  const companyId = new ObjectID();
  const credentials = { _id: userId, company: { _id: companyId } };

  const absences = [
    {
      _id: new ObjectID(),
      type: 'absences',
      startDate: '2019-10-02T10:00:00.000Z',
      endDate: '2019-10-04T12:00:00.000Z',
      auxiliary: userId,
    },
  ];

  const { startDate, misc } = absences[0];
  let payload = {
    startDate,
    misc,
    auxiliary: userId.toHexString(),
  };

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

  it('should update future absences events linked to contract', async () => {
    const contract = { endDate: '2019-10-02T08:00:00.000Z', user: userId };
    const maxEndDate = moment(contract.endDate).hour(22).startOf('h');
    getAbsences.returns(absences);

    payload = { ...payload, endDate: moment(contract.endDate).hour(PLANNING_VIEW_END_HOUR).startOf('h') };
    await EventHelper.updateAbsencesOnContractEnd(userId, contract.endDate, credentials);
    sinon.assert.calledWithExactly(getAbsences, userId, maxEndDate, companyId);
    sinon.assert.calledWithExactly(createEventHistoryOnUpdate, payload, absences[0], credentials);
    sinon.assert.calledWithExactly(updateMany, { _id: { $in: [absences[0]._id] } }, { $set: { endDate: maxEndDate } });
  });
});

describe('detachAuxiliaryFromEvent', () => {
  let findOneUser;

  beforeEach(() => {
    findOneUser = sinon.stub(User, 'findOne');
  });

  afterEach(() => {
    findOneUser.restore();
  });

  it('should detach auxiliary from event', async () => {
    const event = { auxiliary: new ObjectID(), repetition: { frequency: 'every_week' } };
    const companyId = new ObjectID();

    const auxiliary = { sector: 'sector' };
    findOneUser.returns(SinonMongoose.stubChainedQueries([auxiliary]));

    const result = await EventHelper.detachAuxiliaryFromEvent(event, companyId);

    expect(result).toEqual({ sector: 'sector', repetition: { frequency: 'never' } });
    SinonMongoose.calledWithExactly(
      findOneUser,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });
});

describe('createEvent', () => {
  let createEvent;
  let findOneUser;
  let isCreationAllowed;
  let hasConflicts;
  let createEventHistoryOnCreate;
  let populateEventSubscription;
  let createRepetitions;
  let getEvent;
  let deleteConflictInternalHoursAndUnavailabilities;
  let unassignConflictInterventions;
  let detachAuxiliaryFromEvent;

  const companyId = new ObjectID();
  const credentials = { _id: 'qwertyuiop', company: { _id: companyId } };
  beforeEach(() => {
    createEvent = sinon.stub(Event, 'create');
    findOneUser = sinon.stub(User, 'findOne');
    isCreationAllowed = sinon.stub(EventsValidationHelper, 'isCreationAllowed');
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    createEventHistoryOnCreate = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnCreate');
    populateEventSubscription = sinon.stub(EventHelper, 'populateEventSubscription');
    createRepetitions = sinon.stub(EventsRepetitionHelper, 'createRepetitions');
    getEvent = sinon.stub(EventRepository, 'getEvent');
    deleteConflictInternalHoursAndUnavailabilities = sinon.stub(
      EventHelper,
      'deleteConflictInternalHoursAndUnavailabilities'
    );
    unassignConflictInterventions = sinon.stub(EventHelper, 'unassignConflictInterventions');
    detachAuxiliaryFromEvent = sinon.stub(EventHelper, 'detachAuxiliaryFromEvent');
  });
  afterEach(() => {
    createEvent.restore();
    findOneUser.restore();
    isCreationAllowed.restore();
    hasConflicts.restore();
    createEventHistoryOnCreate.restore();
    populateEventSubscription.restore();
    createRepetitions.restore();
    getEvent.restore();
    deleteConflictInternalHoursAndUnavailabilities.restore();
    unassignConflictInterventions.restore();
    detachAuxiliaryFromEvent.restore();
  });

  it('should not create event as creation is not allowed', async () => {
    isCreationAllowed.returns(false);
    try {
      await EventHelper.createEvent({}, credentials);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(422);
    } finally {
      sinon.assert.calledOnceWithExactly(isCreationAllowed, { company: companyId }, credentials);
      sinon.assert.notCalled(createEvent);
    }
  });

  it('should create event as creation is allowed', async () => {
    const newEvent = { type: INTERNAL_HOUR };

    isCreationAllowed.returns(true);
    getEvent.returns({ ...newEvent, populated: true });
    createEvent.returns(newEvent);

    await EventHelper.createEvent(newEvent, credentials);

    sinon.assert.calledOnceWithExactly(createEventHistoryOnCreate, newEvent, credentials);
    sinon.assert.calledOnceWithExactly(getEvent, newEvent._id, credentials);
    sinon.assert.calledOnceWithExactly(populateEventSubscription, { ...newEvent, populated: true });
    sinon.assert.calledOnceWithExactly(createEvent, { ...newEvent, company: companyId });
    sinon.assert.notCalled(findOneUser);
    sinon.assert.notCalled(createRepetitions);
  });

  it('should create repetitions as event is a repetition', async () => {
    const payload = { type: INTERVENTION, repetition: { frequency: EVERY_WEEK } };
    const populatedEvent = { ...payload, _id: new ObjectID(), populated: true };

    isCreationAllowed.returns(true);
    hasConflicts.returns(false);
    createEvent.returns(payload);
    getEvent.returns(populatedEvent);

    await EventHelper.createEvent(payload, credentials);

    sinon.assert.calledOnceWithExactly(createEventHistoryOnCreate, payload, credentials);
    sinon.assert.calledOnceWithExactly(getEvent, payload._id, credentials);
    sinon.assert.calledOnceWithExactly(
      createRepetitions,
      populatedEvent,
      { ...payload, company: companyId, repetition: { ...payload.repetition, parentId: populatedEvent._id } },
      credentials
    );
    sinon.assert.calledOnceWithExactly(populateEventSubscription, populatedEvent);
    sinon.assert.calledOnceWithExactly(createEvent, { ...payload, company: companyId });
    sinon.assert.notCalled(findOneUser);
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
    const auxiliary = { _id: auxiliaryId, sector: new ObjectID() };

    isCreationAllowed.returns(true);
    createEvent.returns(payload);
    getEvent.returns(payload);
    findOneUser.returns(SinonMongoose.stubChainedQueries([auxiliary]));

    await EventHelper.createEvent(payload, credentials);

    sinon.assert.calledOnceWithExactly(
      deleteConflictInternalHoursAndUnavailabilities,
      payload,
      auxiliary,
      credentials
    );
    sinon.assert.calledOnceWithExactly(
      unassignConflictInterventions,
      { startDate: '2019-03-20T10:00:00', endDate: '2019-03-20T12:00:00' },
      auxiliary,
      credentials
    );
    SinonMongoose.calledWithExactly(
      findOneUser,
      [
        { query: 'findOne', args: [{ _id: payload.auxiliary }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });
});

describe('deleteConflictInternalHoursAndUnavailabilities', () => {
  const dates = { startDate: '2019-03-20T10:00:00', endDate: '2019-03-20T12:00:00' };
  const auxiliary = { _id: new ObjectID() };
  const absence = { _id: new ObjectID() };
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
    await EventHelper.deleteConflictInternalHoursAndUnavailabilities(absence, auxiliary, credentials);

    getEventsInConflicts.calledWithExactly(dates, auxiliary._id, [INTERNAL_HOUR, ABSENCE, UNAVAILABILITY], absence._id);
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

    getEventsInConflicts.calledWithExactly(dates, auxiliaryId, [INTERVENTION]);
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
    sinon.assert.calledWithExactly(createEventHistoryOnDelete, deletionInfo, credentials);
    sinon.assert.calledWithExactly(deleteOne, { _id: event._id });
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
    const events = [{ _id: '1234567890' }, { _id: 'qwertyuiop' }, { _id: 'asdfghjkl' }];
    await EventHelper.deleteEvents(events, credentials);

    sinon.assert.callCount(createEventHistoryOnDelete, events.length);
    sinon.assert.calledWithExactly(deleteMany, { _id: { $in: ['1234567890', 'qwertyuiop', 'asdfghjkl'] } });
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
      type: INTERVENTION,
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
      type: INTERVENTION,
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
      type: UNAVAILABILITY,
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
      type: INTERVENTION,
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
      type: INTERVENTION,
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
      type: UNAVAILABILITY,
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
    sinon.assert.calledWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-11-20').startOf('w').toDate(),
      moment('2019-11-20').endOf('w').toDate()
    );
    sinon.assert.calledWithExactly(getContractInfo, versions[1], query, 4);
  });
});

describe('workingStats', () => {
  const auxiliaryId = new ObjectID();
  const query = {
    auxiliary: [auxiliaryId],
    startDate: '2019-12-12',
    endDate: '2019-12-15',
  };
  const distanceMatrix = {
    data: {
      rows: [{
        elements: [{
          distance: { value: 363998 },
          duration: { value: 13790 },
        }],
      }],
    },
    status: 200,
  };
  const companyId = new ObjectID();
  const credentials = { company: { _id: companyId } };
  let UserModel;
  let DistanceMatrixModel;
  let getEventsToPayStub;
  let getContractStub;
  let getContractWeekInfoStub;
  let getPayFromEventsStub;
  let getPayFromAbsencesStub;
  beforeEach(() => {
    UserModel = sinon.mock(User);
    DistanceMatrixModel = sinon.mock(DistanceMatrix);
    getEventsToPayStub = sinon.stub(EventRepository, 'getEventsToPay');
    getContractStub = sinon.stub(EventHelper, 'getContract');
    getContractWeekInfoStub = sinon.stub(EventHelper, 'getContractWeekInfo');
    getPayFromEventsStub = sinon.stub(DraftPayHelper, 'getPayFromEvents');
    getPayFromAbsencesStub = sinon.stub(DraftPayHelper, 'getPayFromAbsences');
  });
  afterEach(() => {
    UserModel.restore();
    DistanceMatrixModel.restore();
    getEventsToPayStub.restore();
    getContractStub.restore();
    getContractWeekInfoStub.restore();
    getPayFromEventsStub.restore();
    getPayFromAbsencesStub.restore();
  });

  it('should return working stats', async () => {
    const contractId = new ObjectID();
    const contracts = [{ _id: contractId }];
    const auxiliaries = [{ _id: auxiliaryId, firstname: 'toto', contracts }];
    UserModel
      .expects('find')
      .withExactArgs({ company: companyId, _id: { $in: query.auxiliary } })
      .chain('populate')
      .chain('lean')
      .returns(auxiliaries);

    DistanceMatrixModel
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('lean')
      .returns(distanceMatrix);

    const contract = { startDate: '2018-11-11', _id: contractId };
    const contractInfo = { contractHours: 10, holidaysHours: 7 };
    const hours = { workedHours: 12 };
    const absencesHours = 3;
    getEventsToPayStub.returns([{ auxiliary: { _id: auxiliaryId }, events: [], absences: [] }]);
    getContractStub.returns(contract);
    getContractWeekInfoStub.returns(contractInfo);
    getPayFromEventsStub.returns(hours);
    getPayFromAbsencesStub.returns(absencesHours);

    const result = await EventHelper.workingStats(query, credentials);

    const expectedResult = {};
    expectedResult[auxiliaryId] = {
      workedHours: hours.workedHours,
      hoursToWork: 0,
    };

    expect(result).toEqual(expectedResult);
    sinon.assert.calledWithExactly(getEventsToPayStub, query.startDate, query.endDate, [auxiliaryId], companyId);
    sinon.assert.calledWithExactly(getContractStub, contracts, query.startDate, query.endDate);
    sinon.assert.calledWithExactly(getContractWeekInfoStub, contract, query);
    sinon.assert.calledWithExactly(getPayFromEventsStub, [], auxiliaries[0], distanceMatrix, [], query);
    sinon.assert.calledWithExactly(getPayFromAbsencesStub, [], contract, query);
    UserModel.verify();
    DistanceMatrixModel.verify();
  });

  it('should return workingstats for all auxiliaries if no auxiliary is specified', async () => {
    const contractId = new ObjectID();
    const contracts = [{ _id: contractId }];
    const auxiliaries = [{ _id: auxiliaryId, firstname: 'toto', contracts }];
    const queryWithoutAuxiliary = omit(query, 'auxiliary');
    UserModel
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('populate')
      .chain('lean')
      .returns(auxiliaries);

    DistanceMatrixModel
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('lean')
      .returns(distanceMatrix);

    const contract = { startDate: '2018-11-11', _id: contractId };
    const contractInfo = { contractHours: 10, holidaysHours: 7 };
    const hours = { workedHours: 12 };
    const absencesHours = 3;
    getEventsToPayStub.returns([{ auxiliary: { _id: auxiliaryId }, events: [], absences: [] }]);
    getContractStub.returns(contract);
    getContractWeekInfoStub.returns(contractInfo);
    getPayFromEventsStub.returns(hours);
    getPayFromAbsencesStub.returns(absencesHours);

    const result = await EventHelper.workingStats(queryWithoutAuxiliary, credentials);
    const expectedResult = {};
    expectedResult[auxiliaryId] = {
      workedHours: hours.workedHours,
      hoursToWork: 0,
    };

    expect(result).toEqual(expectedResult);
    sinon.assert.calledWithExactly(getEventsToPayStub, query.startDate, query.endDate, [auxiliaryId], companyId);
    sinon.assert.calledWithExactly(getContractStub, contracts, query.startDate, query.endDate);
    sinon.assert.calledWithExactly(getContractWeekInfoStub, contract, queryWithoutAuxiliary);
    sinon.assert.calledWithExactly(getPayFromEventsStub, [], auxiliaries[0], distanceMatrix, [], queryWithoutAuxiliary);
    sinon.assert.calledWithExactly(getPayFromAbsencesStub, [], contract, queryWithoutAuxiliary);
    UserModel.verify();
    DistanceMatrixModel.verify();
  });

  it('should return {} if no contract in auxiliaries', async () => {
    UserModel
      .expects('find')
      .withExactArgs({ company: companyId, _id: { $in: query.auxiliary } })
      .chain('populate')
      .chain('lean')
      .returns([{ _id: auxiliaryId, firstname: 'toto' }]);

    DistanceMatrixModel
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('lean')
      .returns(distanceMatrix);

    getEventsToPayStub.returns([{ auxiliary: { _id: auxiliaryId } }]);

    const result = await EventHelper.workingStats(query, credentials);
    expect(result).toEqual({});

    sinon.assert.calledWithExactly(getEventsToPayStub, query.startDate, query.endDate, [auxiliaryId], companyId);
    sinon.assert.notCalled(getContractStub);
    sinon.assert.notCalled(getContractWeekInfoStub);
    sinon.assert.notCalled(getPayFromEventsStub);
    sinon.assert.notCalled(getPayFromAbsencesStub);
    UserModel.verify();
    DistanceMatrixModel.verify();
  });

  it('should return {} if contract not found', async () => {
    const contracts = [{ _id: new ObjectID() }];
    UserModel
      .expects('find')
      .withExactArgs({ company: companyId, _id: { $in: query.auxiliary } })
      .chain('populate')
      .chain('lean')
      .returns([{ _id: auxiliaryId, firstname: 'toto', contracts }]);

    DistanceMatrixModel
      .expects('find')
      .withExactArgs({ company: companyId })
      .chain('lean')
      .returns(distanceMatrix);

    getEventsToPayStub.returns([{ auxiliary: { _id: auxiliaryId } }]);
    getContractStub.returns();

    const result = await EventHelper.workingStats(query, credentials);
    expect(result).toEqual({});

    sinon.assert.calledWithExactly(getEventsToPayStub, query.startDate, query.endDate, [auxiliaryId], companyId);
    sinon.assert.calledWithExactly(getContractStub, contracts, query.startDate, query.endDate);
    sinon.assert.notCalled(getContractWeekInfoStub);
    sinon.assert.notCalled(getPayFromEventsStub);
    sinon.assert.notCalled(getPayFromAbsencesStub);
    UserModel.verify();
    DistanceMatrixModel.verify();
  });
});

describe('getPaidTransportStatsBySector', () => {
  let getDistanceMatrix;
  let getPaidTransportStatsBySector;
  let getPaidTransportInfo;

  beforeEach(() => {
    getDistanceMatrix = sinon.stub(DistanceMatrixHelper, 'getDistanceMatrices');
    getPaidTransportStatsBySector = sinon.stub(EventRepository, 'getPaidTransportStatsBySector');
    getPaidTransportInfo = sinon.stub(DraftPayHelper, 'getPaidTransportInfo');
  });
  afterEach(() => {
    getDistanceMatrix.restore();
    getPaidTransportStatsBySector.restore();
    getPaidTransportInfo.restore();
  });

  it('should return an empty array if there is no event', async () => {
    const query = { sector: new ObjectID(), month: '01-2020' };
    const credentials = { company: { _id: new ObjectID() } };

    getDistanceMatrix.returns([{ duration: 10 }]);
    getPaidTransportStatsBySector.returns([]);

    const result = await EventHelper.getPaidTransportStatsBySector(query, credentials);

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(getDistanceMatrix, credentials);
  });

  it('should return paid transport stats', async () => {
    const query = { sector: new ObjectID(), month: '01-2020' };
    const credentials = { company: { _id: new ObjectID() } };

    const distanceMatrix = [{ duration: 3600 }];
    const events = [
      { startDate: '2020-01-02T15:30', endDate: '2020-01-02T16:30' },
      { startDate: '2020-01-02T17:30', endDate: '2020-01-02T18:30' },
    ];
    const paidTransportStatsBySector = [{
      _id: query.sector,
      auxiliaries: [{ auxiliary: new ObjectID(), days: [{ day: '2020-01-02', events }] }],
    }];

    getDistanceMatrix.returns(distanceMatrix);
    getPaidTransportStatsBySector.returns(paidTransportStatsBySector);
    getPaidTransportInfo.returns({ duration: 60 });

    const result = await EventHelper.getPaidTransportStatsBySector(query, credentials);

    expect(result).toEqual([{ sector: query.sector, duration: 1 }]);
    sinon.assert.calledWithExactly(getDistanceMatrix, credentials);
    sinon.assert.calledWithExactly(getPaidTransportStatsBySector, [query.sector], query.month, credentials.company._id);
    sinon.assert.calledWithExactly(getPaidTransportInfo, events[1], events[0], distanceMatrix);
  });

  it('should return paid transport stats for many sectors', async () => {
    const query = { sector: [new ObjectID(), new ObjectID()], month: '01-2020' };
    const credentials = { company: { _id: new ObjectID() } };

    const distanceMatrix = [{ duration: 3600 }, { duration: 5400 }];
    const eventsFirstSector = [
      { startDate: '2020-01-02T15:30', endDate: '2020-01-02T16:30' },
      { startDate: '2020-01-02T17:30', endDate: '2020-01-02T18:30' },
    ];
    const eventsSecondSector = [
      { startDate: '2020-01-02T15:30', endDate: '2020-01-02T16:30' },
      { startDate: '2020-01-02T17:30', endDate: '2020-01-02T18:30' },
    ];
    const paidTransportStatsBySector = [
      {
        _id: query.sector[0],
        auxiliaries: [{ auxiliary: new ObjectID(), days: [{ day: '2020-01-02', events: eventsFirstSector }] }],
      },
      {
        _id: query.sector[1],
        auxiliaries: [{ auxiliary: new ObjectID(), days: [{ day: '2020-01-02', events: eventsSecondSector }] }],
      },
    ];

    getDistanceMatrix.returns(distanceMatrix);
    getPaidTransportStatsBySector.returns(paidTransportStatsBySector);
    getPaidTransportInfo.onCall(0).returns({ duration: 60 });
    getPaidTransportInfo.onCall(1).returns({ duration: 90 });

    const result = await EventHelper.getPaidTransportStatsBySector(query, credentials);

    expect(result).toEqual([{ sector: query.sector[0], duration: 1 }, { sector: query.sector[1], duration: 1.5 }]);
    sinon.assert.calledWithExactly(getDistanceMatrix, credentials);
    sinon.assert.calledWithExactly(getPaidTransportStatsBySector, query.sector, query.month, credentials.company._id);
    sinon.assert.calledWithExactly(
      getPaidTransportInfo.getCall(0),
      eventsFirstSector[1],
      eventsFirstSector[0],
      distanceMatrix
    );
    sinon.assert.calledWithExactly(
      getPaidTransportInfo.getCall(1),
      eventsSecondSector[1],
      eventsSecondSector[0],
      distanceMatrix
    );
  });

  it('should not call getPaidTransportInfo if only one event for one day', async () => {
    const query = { sector: new ObjectID(), month: '01-2020' };
    const credentials = { company: { _id: new ObjectID() } };

    const distanceMatrix = [{ duration: 3600 }];
    const events = [
      { startDate: '2020-01-02T15:30', endDate: '2020-01-02T16:30' },
    ];
    const paidTransportStatsBySector = [{
      _id: query.sector,
      auxiliaries: [{ auxiliary: new ObjectID(), days: [{ day: '2020-01-02', events }] }],
    }];

    getDistanceMatrix.returns(distanceMatrix);
    getPaidTransportStatsBySector.returns(paidTransportStatsBySector);

    const result = await EventHelper.getPaidTransportStatsBySector(query, credentials);

    expect(result).toEqual([{ sector: query.sector, duration: 0 }]);
    sinon.assert.calledWithExactly(getDistanceMatrix, credentials);
    sinon.assert.calledWithExactly(getPaidTransportStatsBySector, [query.sector], query.month, credentials.company._id);
    sinon.assert.notCalled(getPaidTransportInfo);
  });
});

describe('getUnassignedHoursBySector', () => {
  let getUnassignedHoursBySector;

  beforeEach(() => {
    getUnassignedHoursBySector = sinon.stub(EventRepository, 'getUnassignedHoursBySector');
  });
  afterEach(() => {
    getUnassignedHoursBySector.restore();
  });

  it('should return an empty array if there is no unassigned event', async () => {
    const query = { sector: new ObjectID(), month: '01-2020' };
    const credentials = { company: { _id: new ObjectID() } };

    getUnassignedHoursBySector.returns([]);

    const result = await EventHelper.getUnassignedHoursBySector(query, credentials);

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(getUnassignedHoursBySector, [query.sector], query.month, credentials.company._id);
  });

  it('should return unassigned hours', async () => {
    const query = { sector: new ObjectID(), month: '01-2020' };
    const credentials = { company: { _id: new ObjectID() } };

    const unassignedhours = [{ sector: query.sector, duration: 12 }];

    getUnassignedHoursBySector.returns(unassignedhours);

    const result = await EventHelper.getUnassignedHoursBySector(query, credentials);

    expect(result).toEqual(unassignedhours);
    sinon.assert.calledWithExactly(getUnassignedHoursBySector, [query.sector], query.month, credentials.company._id);
  });

  it('should return unassigned hours for many sectors', async () => {
    const query = { sector: [new ObjectID(), new ObjectID()], month: '01-2020' };
    const credentials = { company: { _id: new ObjectID() } };

    const unassignedHours = [{ sector: query.sector[0], duration: 12 }, { sector: query.sector[1], duration: 5 }];

    getUnassignedHoursBySector.returns(unassignedHours);

    const result = await EventHelper.getUnassignedHoursBySector(query, credentials);

    expect(result).toEqual(unassignedHours);
    sinon.assert.calledWithExactly(getUnassignedHoursBySector, query.sector, query.month, credentials.company._id);
  });
});
