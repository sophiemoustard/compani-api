const expect = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const UtilsHelper = require('../../../src/helpers/utils');
const EventRepository = require('../../../src/repositories/EventRepository');

describe('formatEvents', () => {
  let getMatchingObject;
  beforeEach(() => {
    getMatchingObject = sinon.stub(UtilsHelper, 'getMatchingObject');
  });
  afterEach(() => {
    getMatchingObject.restore();
  });

  it('should format event', () => {
    const event = { _id: new ObjectId(), internalHour: new ObjectId() };
    expect(EventRepository.formatEvent(event)).toEqual(event);

    sinon.assert.notCalled(getMatchingObject);
  });

  it('should format event auxiliary', () => {
    const event = {
      _id: new ObjectId(),
      internalHour: new ObjectId(),
      auxiliary: { sectorHistories: [{ startDate: '2021-02-12T09:00:00' }, { startDate: '2021-01-12T09:00:00' }] },
      startDate: '2021-03-12T09:00:00',
    };

    getMatchingObject.returns({ sector: { startDate: '2021-02-12T09:00:00' } });

    const formattedEvent = EventRepository.formatEvent(event);

    expect(formattedEvent).toEqual({
      _id: event._id,
      internalHour: event.internalHour,
      startDate: '2021-03-12T09:00:00',
      auxiliary: { sector: { startDate: '2021-02-12T09:00:00' } },
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
    };

    const formattedEvent = EventRepository.formatEvent(event);

    expect(formattedEvent).toEqual({
      _id: event._id,
      internalHour: event.internalHour,
      startDate: '2021-03-12T09:00:00',
      customer: { subscriptions: [{ _id: subId }, { _id: otherSubId }] },
      subscription: { _id: subId },
    });
    sinon.assert.notCalled(getMatchingObject);
  });
});
