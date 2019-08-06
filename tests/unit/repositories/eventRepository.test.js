const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Event = require('../../../models/Event');
const EventRepository = require('../../../repositories/EventRepository');

describe('removeEventsExceptInterventions', () => {
  it('should remove future non-intervention events', async () => {
    const endDate = moment().toDate();
    const auxiliary = new ObjectID();
    const contract = { endDate, user: auxiliary };
    const EventDeleteManyStub = sinon.stub(Event, 'deleteMany');

    await EventRepository.removeEventsExceptInterventions(contract);
    sinon.assert.calledWith(EventDeleteManyStub, { startDate: { $gt: endDate }, subscription: { $exists: false }, auxiliary });
    EventDeleteManyStub.restore();
  });
});
