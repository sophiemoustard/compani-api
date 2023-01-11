const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const UtilsHelper = require('../../../src/helpers/utils');
const SinonMongoose = require('../sinonMongoose');
const EventRepository = require('../../../src/repositories/EventRepository');
const Event = require('../../../src/models/Event');
const { INTERVENTION } = require('../../../src/helpers/constants');

describe('formatEvents', () => {
  let getMatchingObject;
  beforeEach(() => {
    getMatchingObject = sinon.stub(UtilsHelper, 'getMatchingObject');
  });
  afterEach(() => {
    getMatchingObject.restore();
  });

  it('should format event', () => {
    const eventId = new ObjectId();
    const event = {
      _id: eventId,
      type: INTERVENTION,
      histories: [{
        action: 'manual_time_stamping',
        update: { startHour: { from: '2022-02-11T15:00:00Z', to: '2022-02-11T15:04:00Z' } },
      }],
    };
    const formattedEvent = EventRepository.formatEvent(event);

    expect(formattedEvent).toEqual({
      _id: eventId,
      type: INTERVENTION,
      startDateTimeStamp: true,
      endDateTimeStamp: false,
    });
    sinon.assert.notCalled(getMatchingObject);
  });

  it('should format event auxiliary', () => {
    const event = {
      _id: new ObjectId(),
      internalHour: new ObjectId(),
      auxiliary: { sectorHistories: [{ startDate: '2021-02-12T09:00:00' }, { startDate: '2021-01-12T09:00:00' }] },
      startDate: '2021-03-12T09:00:00',
      histories: [],
    };

    getMatchingObject.returns({ sector: { startDate: '2021-02-12T09:00:00' } });

    const formattedEvent = EventRepository.formatEvent(event);

    expect(formattedEvent).toEqual({
      _id: event._id,
      internalHour: event.internalHour,
      startDate: '2021-03-12T09:00:00',
      auxiliary: { sector: { startDate: '2021-02-12T09:00:00' } },
      startDateTimeStamp: false,
      endDateTimeStamp: false,
    });
    sinon.assert.calledOnceWithExactly(
      getMatchingObject,
      '2021-03-12T09:00:00',
      [{ startDate: '2021-02-12T09:00:00' }, { startDate: '2021-01-12T09:00:00' }],
      'startDate'
    );
  });

  it('should format event subscription', () => {
    const subId = new ObjectId();
    const otherSubId = new ObjectId();
    const event = {
      _id: new ObjectId(),
      internalHour: new ObjectId(),
      startDate: '2021-03-12T09:00:00',
      customer: { subscriptions: [{ _id: subId }, { _id: otherSubId }] },
      subscription: subId,
      histories: [],
    };

    const formattedEvent = EventRepository.formatEvent(event);

    expect(formattedEvent).toEqual({
      _id: event._id,
      internalHour: event.internalHour,
      startDate: '2021-03-12T09:00:00',
      customer: { subscriptions: [{ _id: subId }, { _id: otherSubId }] },
      subscription: { _id: subId },
      startDateTimeStamp: false,
      endDateTimeStamp: false,
    });
    sinon.assert.notCalled(getMatchingObject);
  });
});

describe('getAuxiliaryEventsBetweenDates', () => {
  let find;
  const eventIds = [
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
  ];
  const events = [
    { _id: eventIds[0] },
    { _id: eventIds[1], isBilled: true },
    { _id: eventIds[2], isBilled: false },
    { _id: eventIds[3], startDateTimeStamp: 1 },
    { _id: eventIds[4], startDateTimeStamp: 0 },
    { _id: eventIds[5], endDateTimeStamp: 0 },
    { _id: eventIds[6], endDateTimeStamp: 1 },
    { _id: eventIds[7], type: 'absence' },
  ];

  beforeEach(() => {
    find = sinon.stub(Event, 'find');
  });

  afterEach(() => {
    find.restore();
  });

  it('should return events if type is not specified', async () => {
    const startDate = '2022-09-12T00:00:00.000Z';
    const endDate = '2022-09-14T00:00:00.000Z';
    const auxiliary = new ObjectId();
    const companyId = new ObjectId();
    find.returns(SinonMongoose.stubChainedQueries(events));

    const result = await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate, companyId);

    expect(result).toEqual(events);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{
            auxiliary,
            startDate: { $lt: new Date(endDate) },
            endDate: { $gt: new Date(startDate) },
            company: companyId,
          }],
        },
        { query: 'populate', args: [{ path: 'startDateTimeStamp' }] },
        { query: 'populate', args: [{ path: 'endDateTimeStamp' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return events from type, or billed or timestamped, if type specified', async () => {
    const startDate = '2022-09-12T00:00:00.000Z';
    const endDate = '2022-09-14T00:00:00.000Z';
    const auxiliary = new ObjectId();
    const companyId = new ObjectId();
    find.returns(SinonMongoose.stubChainedQueries(events));

    const result = await EventRepository.getAuxiliaryEventsBetweenDates(
      auxiliary,
      startDate,
      endDate,
      companyId,
      'absence');

    expect(result).toEqual([events[1], events[3], events[6], events[7]]);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{
            auxiliary,
            startDate: { $lt: new Date(endDate) },
            endDate: { $gt: new Date(startDate) },
            company: companyId,
          }],
        },
        { query: 'populate', args: [{ path: 'startDateTimeStamp' }] },
        { query: 'populate', args: [{ path: 'endDateTimeStamp' }] },
        { query: 'lean' },
      ]
    );
  });
});
