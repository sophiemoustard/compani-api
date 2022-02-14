const expect = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const UtilsHelper = require('../../../src/helpers/utils');
const EventRepository = require('../../../src/repositories/EventRepository');
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
