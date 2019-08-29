const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Event = require('../../../models/Event');
const EventRepository = require('../../../repositories/EventRepository');
require('sinon-mongoose');

describe('getEventsExceptInterventions', () => {
  it('should get future non-intervention events', async () => {
    const endDate = moment().toDate();
    const auxiliary = new ObjectID();
    const contract = { endDate, user: auxiliary };
    const EventFindMock = sinon.mock(Event);

    EventFindMock.expects('find')
      .withArgs({ startDate: { $gt: endDate }, subscription: { $exists: false }, auxiliary })
      .chain('lean');

    await EventRepository.getEventsExceptInterventions(contract);
    EventFindMock.verify();
    EventFindMock.restore();
  });
});

describe('getUnassignedInterventions', () => {
  it('should get future interventions events', async () => {
    const endDate = moment().toDate();
    const auxiliary = new ObjectID();
    const ids = [new ObjectID(), new ObjectID()];
    const EventFindMock = sinon.mock(Event);

    EventFindMock.expects('find')
      .withArgs({ startDate: { $gt: endDate }, auxiliary, subscription: { $in: ids }, isBilled: false })
      .chain('lean');

    await EventRepository.getUnassignedInterventions(endDate, auxiliary, ids);
    EventFindMock.verify();
    EventFindMock.restore();
  });
});

describe('getAbsences', () => {
  it('should get future absences events', async () => {
    const endDate = moment().toDate();
    const auxiliary = new ObjectID();
    const EventFindMock = sinon.mock(Event);

    EventFindMock.expects('find')
      .withArgs({ type: 'absence', startDate: { $lte: endDate }, endDate: { $gt: endDate }, auxiliary })
      .chain('lean');

    await EventRepository.getAbsences(auxiliary, endDate);
    EventFindMock.verify();
    EventFindMock.restore();
  });
});
