const { expect } = require('expect');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const { ObjectId } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const EventHistory = require('../../../src/models/EventHistory');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const EventRepository = require('../../../src/repositories/EventRepository');
const {
  INTERVENTION,
  ABSENCE,
  INTERNAL_HOUR,
  TIME_STAMPING_ACTIONS,
  EVERY_DAY,
} = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

describe('isCustomerSubscriptionValid', () => {
  let countDocuments;
  beforeEach(() => {
    countDocuments = sinon.stub(Customer, 'countDocuments');
  });
  afterEach(() => {
    countDocuments.restore();
  });

  it('should return true if event subscription is in customer subscriptions', async () => {
    const event = {
      auxiliary: new ObjectId(),
      customer: new ObjectId(),
      type: INTERVENTION,
      subscription: new ObjectId(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
    };

    countDocuments.returns(1);

    const result = await EventsValidationHelper.isCustomerSubscriptionValid(event);

    expect(result).toBe(true);
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      {
        _id: event.customer,
        'subscriptions._id': event.subscription,
        $or: [{ stoppedAt: { $exists: false } }, { stoppedAt: { $gte: event.startDate } }],
      }
    );
  });

  it('should return false if event subscription is not in customer subscriptions', async () => {
    const event = {
      auxiliary: new ObjectId(),
      customer: new ObjectId(),
      type: INTERVENTION,
      subscription: new ObjectId(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
    };

    countDocuments.returns(0);

    const result = await EventsValidationHelper.isCustomerSubscriptionValid(event);

    expect(result).toBe(false);
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      {
        _id: event.customer,
        'subscriptions._id': event.subscription,
        $or: [{ stoppedAt: { $exists: false } }, { stoppedAt: { $gte: event.startDate } }],
      }
    );
  });
});

describe('isUserContractValidOnEventDates', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return false as user has no contract', async () => {
    const event = { auxiliary: new ObjectId() };
    const user = { _id: event.auxiliary };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return false as user contracts are empty', async () => {
    const event = { auxiliary: new ObjectId() };
    const user = { _id: event.auxiliary, contracts: [] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return false if contract and no active contract on day and event not absence', async () => {
    const event = { auxiliary: new ObjectId(), startDate: '2020-04-30T09:00:00.000Z', type: INTERVENTION };
    const contract = { user: event.auxiliary, startDate: '2020-12-05T00:00:00.000Z' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return true if contract and active contract on day and event not absence', async () => {
    const event = { auxiliary: new ObjectId(), startDate: '2020-04-30T09:00:00.000Z', type: INTERNAL_HOUR };
    const contract = { user: event.auxiliary, startDate: '2020-01-04T00:00:00.000Z' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(true);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return false if contract and no active contract on day and event is absence', async () => {
    const event = {
      auxiliary: new ObjectId(),
      startDate: '2020-04-30T09:00:00.000Z',
      endDate: '2020-05-12T23:25:59.000Z',
      type: ABSENCE,
    };
    const contract = { user: event.auxiliary, startDate: '2020-05-04T00:00:00.000Z' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return true if contract and active contract on day and event is absence', async () => {
    const event = {
      auxiliary: new ObjectId(),
      startDate: '2020-04-30T09:00:00.000Z',
      endDate: '2020-05-12T23:25:59.000Z',
      type: ABSENCE,
    };
    const contract = { user: event.auxiliary, startDate: '2020-01-04T00:00:00.000Z' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(true);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return true if auxiliary has non-ended contract and event is repetition', async () => {
    const event = {
      auxiliary: new ObjectId(),
      startDate: '2020-04-30T09:00:00.000Z',
      endDate: '2020-04-30T11:25:59.000Z',
      type: INTERVENTION,
      repetition: { parentId: new ObjectId(), frequency: EVERY_DAY },
    };
    const contracts = [
      { user: event.auxiliary, startDate: '2020-01-04T00:00:00.000Z' },
      { user: event.auxiliary, startDate: '2018-01-04T00:00:00.000Z', endDate: '2018-05-20T00:00:00.000Z' },
    ];
    const user = { _id: event.auxiliary, contracts };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(true);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return false if auxiliary has ended contract and event is repetition', async () => {
    const event = {
      auxiliary: new ObjectId(),
      startDate: '2020-04-30T09:00:00.000Z',
      endDate: '2020-04-30T11:25:59.000Z',
      type: INTERVENTION,
      repetition: { parentId: new ObjectId(), frequency: EVERY_DAY },
    };
    const contract = {
      user: event.auxiliary,
      startDate: '2020-01-04T00:00:00.000Z',
      endDate: '2020-01-30T00:00:00.000Z',
    };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
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
      _id: new ObjectId(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: new ObjectId(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: new ObjectId(), startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' },
    ]);
    const result = await EventsValidationHelper.hasConflicts(event);

    expect(result).toBeTruthy();
  });

  it('should return false if event does not have conflicts', async () => {
    const event = {
      _id: new ObjectId(),
      startDate: '2019-10-02T15:00:00.000Z',
      endDate: '2019-10-02T16:00:00.000Z',
      auxiliary: new ObjectId(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: event._id, startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' },
    ]);
    const result = await EventsValidationHelper.hasConflicts(event);

    expect(result).toBeFalsy();
  });

  it('should return false if event has conflicts only with cancelled events', async () => {
    const event = {
      _id: new ObjectId(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: new ObjectId(),
    };

    getAuxiliaryEventsBetweenDates.returns([{
      _id: new ObjectId(),
      startDate: '2019-10-02T08:00:00.000Z',
      endDate: '2019-10-02T12:00:00.000Z',
      isCancelled: true,
    }]);
    const result = await EventsValidationHelper.hasConflicts(event);

    expect(result).toBeFalsy();
  });

  it('should only check conflicts with absence when absence is created', async () => {
    const auxiliaryId = new ObjectId();
    const event = {
      _id: new ObjectId(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: auxiliaryId,
      type: ABSENCE,
      company: new ObjectId(),
    };

    getAuxiliaryEventsBetweenDates.returns([{
      _id: new ObjectId(),
      startDate: '2019-10-02T08:00:00.000Z',
      endDate: '2019-10-02T12:00:00.000Z',
      type: ABSENCE,
    }]);

    await EventsValidationHelper.hasConflicts(event);

    sinon.assert.calledWithExactly(
      getAuxiliaryEventsBetweenDates,
      auxiliaryId,
      '2019-10-02T09:00:00.000Z',
      '2019-10-02T11:00:00.000Z',
      event.company,
      ABSENCE
    );
  });
});

describe('checkDeletionIsAllowed', () => {
  let eventHistoryCountDocuments;
  beforeEach(() => {
    eventHistoryCountDocuments = sinon.stub(EventHistory, 'countDocuments');
  });
  afterEach(() => {
    eventHistoryCountDocuments.restore();
  });

  it('should return nothing if events are not interventions', async () => {
    const events = [{ _id: new ObjectId(), type: INTERNAL_HOUR, isBilled: true }];

    eventHistoryCountDocuments.returns(0);

    await EventsValidationHelper.checkDeletionIsAllowed(events);

    sinon.assert.calledOnceWithExactly(
      eventHistoryCountDocuments, {
        'event.eventId': { $in: events.map(event => event._id) },
        'event.type': INTERVENTION,
        action: { $in: TIME_STAMPING_ACTIONS },
        isCancelled: false,
      }
    );
  });

  it('should return nothing if events are not billed and not timestamped', async () => {
    const events = [{ _id: new ObjectId(), type: INTERVENTION, isBilled: false }];

    eventHistoryCountDocuments.returns(0);

    await EventsValidationHelper.checkDeletionIsAllowed(events);

    sinon.assert.calledOnceWithExactly(
      eventHistoryCountDocuments, {
        'event.eventId': { $in: events.map(event => event._id) },
        'event.type': INTERVENTION,
        action: { $in: TIME_STAMPING_ACTIONS },
        isCancelled: false,
      }
    );
  });

  it('should return conflict if at least one event is a billed intervention', async () => {
    const events = [
      { _id: new ObjectId(), type: INTERVENTION, isBilled: true },
      { _id: new ObjectId(), type: INTERVENTION, isBilled: false },
    ];
    try {
      await EventsValidationHelper.checkDeletionIsAllowed(events);

      expect(false).toBe(true);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('Vous ne pouvez pas supprimer un évènement facturé.'));
    } finally {
      sinon.assert.notCalled(eventHistoryCountDocuments);
    }
  });

  it('should return conflict if at least one event is a timestamped intervention', async () => {
    const events = [
      { _id: new ObjectId(), type: INTERVENTION, isBilled: false },
      { _id: new ObjectId(), type: INTERVENTION, isBilled: false },
    ];

    eventHistoryCountDocuments.returns(1);

    try {
      await EventsValidationHelper.checkDeletionIsAllowed(events);

      expect(false).toBe(true);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('Vous ne pouvez pas supprimer un évènement horodaté.'));
    } finally {
      sinon.assert.calledOnceWithExactly(
        eventHistoryCountDocuments, {
          'event.eventId': { $in: events.map(event => event._id) },
          'event.type': INTERVENTION,
          action: { $in: TIME_STAMPING_ACTIONS },
          isCancelled: false,
        }
      );
    }
  });
});
