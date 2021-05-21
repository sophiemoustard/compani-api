const expect = require('expect');
const { ObjectID } = require('mongodb');
const EventRepository = require('../../../src/repositories/EventRepository');

describe('formatEvents', () => {
  it('should format event', () => {
    const event = { _id: new ObjectID(), internalHour: new ObjectID() };
    expect(EventRepository.formatEvent(event)).toEqual(event);
  });

  it('should format event auxiliary', () => {
    const event = {
      _id: new ObjectID(),
      internalHour: new ObjectID(),
      auxiliary: { sectorHistories: [{ startDate: '2021-02-12T09:00:00' }, { startDate: '2021-01-12T09:00:00' }] },
      startDate: '2021-03-12T09:00:00',
    };

    const formattedEvent = EventRepository.formatEvent(event);

    expect(formattedEvent).toEqual({
      _id: event._id,
      internalHour: event.internalHour,
      startDate: '2021-03-12T09:00:00',
      auxiliary: { sector: { startDate: '2021-02-12T09:00:00' } },
    });
  });

  it('should format event histories', () => {
    const subId = new ObjectID();
    const otherSubId = new ObjectID();
    const event = {
      _id: new ObjectID(),
      internalHour: new ObjectID(),
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
  });
});
