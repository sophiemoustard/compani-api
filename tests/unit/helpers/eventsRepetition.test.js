const expect = require('expect');
const sinon = require('sinon');
const momentRange = require('moment-range');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const moment = require('../../../src/extensions/moment');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const Repetition = require('../../../src/models/Repetition');
const Customer = require('../../../src/models/Customer');
const EventsHelper = require('../../../src/helpers/events');
const EventsRepetitionHelper = require('../../../src/helpers/eventsRepetition');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const DatesHelper = require('../../../src/helpers/dates');
const CustomerAbsencesHelper = require('../../../src/helpers/customerAbsences');
const RepetitionHelper = require('../../../src/helpers/repetitions');
const {
  INTERVENTION,
  ABSENCE,
  NEVER,
  EVERY_WEEK,
  INTERNAL_HOUR,
  UNAVAILABILITY,
} = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

momentRange.extendMoment(moment);

describe('formatRepeatedPayload', () => {
  let hasConflicts;
  let isAbsent;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    isAbsent = sinon.stub(CustomerAbsencesHelper, 'isAbsent');
  });
  afterEach(() => {
    hasConflicts.restore();
    isAbsent.restore();
  });

  it('should format event with auxiliary', async () => {
    const sector = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const auxiliaryId = new ObjectID();
    const event = {
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      auxiliary: auxiliaryId,
      type: 'intervention',
    };
    const step = day.diff(event.startDate, 'd');
    const payload = {
      ...omit(event, '_id'),
      startDate: moment(event.startDate).add(step, 'd'),
      endDate: moment(event.endDate).add(step, 'd'),
    };
    hasConflicts.returns(false);
    isAbsent.returns(false);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, sector, day);

    expect(result).toBeDefined();
    expect(result.startDate).toEqual(moment('2019-07-17').startOf('d').toDate());
    expect(result.endDate).toEqual(moment('2019-07-18').startOf('d').toDate());
    expect(result.auxiliary).toEqual(auxiliaryId);
    sinon.assert.calledWithExactly(hasConflicts, payload);
    sinon.assert.calledOnceWithExactly(isAbsent, event.customer, payload.startDate);
  });

  it('should format intervention without auxiliary', async () => {
    const sector = new ObjectID();
    const auxiliaryId = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const event = {
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      auxiliary: auxiliaryId,
      type: 'intervention',
      repetition: { frequency: 'every_week' },
    };
    const step = day.diff(event.startDate, 'd');
    const payload = {
      ...omit(event, '_id'),
      startDate: moment(event.startDate).add(step, 'd'),
      endDate: moment(event.endDate).add(step, 'd'),
    };
    hasConflicts.returns(true);
    isAbsent.returns(false);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, sector, day);

    expect(result).toBeDefined();
    expect(result.startDate).toEqual(moment('2019-07-17').startOf('d').toDate());
    expect(result.endDate).toEqual(moment('2019-07-18').startOf('d').toDate());
    expect(result.auxiliary).toBeUndefined();
    expect(result.sector).toEqual(sector);
    expect(result.repetition.frequency).toEqual('never');
    sinon.assert.calledWithExactly(hasConflicts, payload);
  });

  it('should format internal hour with auxiliary', async () => {
    const sector = new ObjectID();
    const auxiliaryId = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const event = {
      _id: new ObjectID(),
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      auxiliary: auxiliaryId,
      type: INTERNAL_HOUR,
    };
    const step = day.diff(event.startDate, 'd');
    const payload = {
      ...omit(event, '_id'),
      startDate: moment(event.startDate).add(step, 'd'),
      endDate: moment(event.endDate).add(step, 'd'),
    };
    hasConflicts.returns(false);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, sector, day);

    expect(result).toBeDefined();
    expect(result.auxiliary).toBeDefined();
    expect(result.sector).toBeUndefined();
    sinon.assert.calledWithExactly(hasConflicts, payload);
    sinon.assert.notCalled(isAbsent);
  });

  it('should not called hasConflicts if event is not affected', async () => {
    const sector = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const event = {
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      type: 'intervention',
      sector: sector.toHexString(),
    };
    const step = day.diff(event.startDate, 'd');
    const payload = {
      ...omit(event, '_id'),
      startDate: moment(event.startDate).add(step, 'd'),
      endDate: moment(event.endDate).add(step, 'd'),
    };

    hasConflicts.returns(false);
    isAbsent.returns(false);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, sector, day);

    expect(result).toBeDefined();
    expect(result.auxiliary).toBeUndefined();
    expect(result.sector).toEqual(sector);
    sinon.assert.calledWithExactly(hasConflicts, payload);
  });

  it('should return null if event has conflict', async () => {
    const sector = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const event = {
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      type: 'intervention',
    };
    const step = day.diff(event.startDate, 'd');
    const payload = {
      ...omit(event, '_id'),
      startDate: moment(event.startDate).add(step, 'd'),
      endDate: moment(event.endDate).add(step, 'd'),
    };
    isAbsent.returns(false);

    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, sector, day);

    expect(result).toBeDefined();
    expect(result.auxiliary).toBeUndefined();
    sinon.assert.calledWithExactly(hasConflicts, payload);
  });

  it('should return null if event is an internal hour and auxiliary has conflict', async () => {
    const sector = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const event = {
      _id: new ObjectID(),
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      type: INTERNAL_HOUR,
    };
    const step = day.diff(event.startDate, 'd');
    const payload = {
      ...omit(event, '_id'),
      startDate: moment(event.startDate).add(step, 'd'),
      endDate: moment(event.endDate).add(step, 'd'),
    };
    hasConflicts.returns(true);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, sector, day);

    expect(result).toBeNull();
    sinon.assert.calledWithExactly(hasConflicts, payload);
    sinon.assert.notCalled(isAbsent);
  });

  it('should return null if event is an unavailability and auxiliary has conflict', async () => {
    const sector = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const event = {
      _id: new ObjectID(),
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      type: 'unavailability',
    };
    const step = day.diff(event.startDate, 'd');
    const payload = {
      ...omit(event, '_id'),
      startDate: moment(event.startDate).add(step, 'd'),
      endDate: moment(event.endDate).add(step, 'd'),
    };
    hasConflicts.returns(true);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, sector, day);

    expect(result).toBeNull();
    sinon.assert.calledWithExactly(hasConflicts, payload);
    sinon.assert.notCalled(isAbsent);
  });

  it('should return null if customer is absent', async () => {
    const sector = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const auxiliaryId = new ObjectID();
    const event = {
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      auxiliary: auxiliaryId,
      type: 'intervention',
    };
    const step = day.diff(event.startDate, 'd');
    const payload = {
      ...omit(event, '_id'),
      startDate: moment(event.startDate).add(step, 'd'),
      endDate: moment(event.endDate).add(step, 'd'),
    };

    hasConflicts.returns(false);
    isAbsent.returns(true);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, sector, day);

    expect(result).toBeNull();
    sinon.assert.calledWithExactly(isAbsent, event.customer, payload.startDate);
  });
});

describe('createRepeatedEvents', () => {
  let formatRepeatedPayload;
  let customerFindOne;
  let insertMany;
  beforeEach(() => {
    formatRepeatedPayload = sinon.stub(EventsRepetitionHelper, 'formatRepeatedPayload');
    customerFindOne = sinon.stub(Customer, 'findOne');
    insertMany = sinon.stub(Event, 'insertMany');
  });
  afterEach(() => {
    formatRepeatedPayload.restore();
    customerFindOne.restore();
    insertMany.restore();
  });

  it('should create repetition for each range', async () => {
    const sector = new ObjectID();
    const event = {
      type: INTERVENTION,
      startDate: '2019-01-10T09:00:00.000Z',
      endDate: '2019-01-10T11:00:00.000Z',
      customer: new ObjectID(),
    };
    const range = ['2019-01-11T09:00:00.000Z', '2019-01-12T09:00:00.000Z', '2019-01-13T09:00:00.000Z'];
    const repeatedEvents = [
      new Event({ company: new ObjectID(), startDate: range[0] }),
      new Event({ company: new ObjectID(), startDate: range[1] }),
      new Event({ company: new ObjectID(), startDate: range[2] }),
    ];

    formatRepeatedPayload.onCall(0).returns(repeatedEvents[0]);
    formatRepeatedPayload.onCall(1).returns(repeatedEvents[1]);
    formatRepeatedPayload.onCall(2).returns(repeatedEvents[2]);
    customerFindOne.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

    await EventsRepetitionHelper.createRepeatedEvents(event, range, sector, false);

    sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(0), event, sector, '2019-01-11T09:00:00.000Z');
    sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(1), event, sector, '2019-01-12T09:00:00.000Z');
    sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(2), event, sector, '2019-01-13T09:00:00.000Z');
    sinon.assert.calledOnceWithExactly(insertMany, repeatedEvents);
    SinonMongoose.calledWithExactly(
      customerFindOne,
      [
        { query: 'findOne', args: [{ _id: event.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }] },
        { query: 'lean' },
      ]
    );
  });

  it('should not create repetition on week-end for week day repetition', async () => {
    const sector = new ObjectID();
    const event = {
      type: INTERVENTION,
      startDate: '2019-01-10T09:00:00.000Z',
      endDate: '2019-01-10T11:00:00.000Z',
      customer: new ObjectID(),
    };
    const range = [
      '2019-01-11T09:00:00.000Z',
      '2019-01-12T09:00:00.000Z',
      '2019-01-13T09:00:00.000Z',
      '2019-01-14T09:00:00.000Z',
    ];
    const fridayEvent = new Event({ company: new ObjectID(), startDate: range[0] });
    const mondayEvent = new Event({ company: new ObjectID(), startDate: range[3] });

    formatRepeatedPayload.onCall(0).returns(fridayEvent);
    formatRepeatedPayload.onCall(1).returns(mondayEvent);
    customerFindOne.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

    await EventsRepetitionHelper.createRepeatedEvents(event, range, sector, true);

    sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(0), event, sector, '2019-01-11T09:00:00.000Z');
    sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(1), event, sector, '2019-01-14T09:00:00.000Z');
    sinon.assert.calledOnceWithExactly(insertMany, [fridayEvent, mondayEvent]);
    SinonMongoose.calledWithExactly(
      customerFindOne,
      [
        { query: 'findOne', args: [{ _id: event.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }] },
        { query: 'lean' },
      ]
    );
  });

  it('should not insert events after stopping date', async () => {
    const sector = new ObjectID();
    const event = {
      type: INTERVENTION,
      startDate: '2019-01-10T09:00:00.000Z',
      endDate: '2019-01-10T11:00:00.000Z',
      customer: new ObjectID(),
    };
    const range = ['2019-01-11T09:00:00.000Z', '2019-01-12T09:00:00.000Z', '2019-01-13T09:00:00.000Z'];
    const customer = { _id: event.customer, stoppedAt: new Date('2019-01-12T11:00:00.000Z') };
    const repeatedEvents = [
      new Event({ company: new ObjectID(), startDate: range[0] }),
      new Event({ company: new ObjectID(), startDate: range[1] }),
      new Event({ company: new ObjectID(), startDate: range[2] }),
    ];

    formatRepeatedPayload.onCall(0).returns(repeatedEvents[0]);
    formatRepeatedPayload.onCall(1).returns(repeatedEvents[1]);
    formatRepeatedPayload.onCall(2).returns(repeatedEvents[2]);
    customerFindOne.returns(SinonMongoose.stubChainedQueries([customer], ['lean']));

    await EventsRepetitionHelper.createRepeatedEvents(event, range, sector, false);

    sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(0), event, sector, '2019-01-11T09:00:00.000Z');
    sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(1), event, sector, '2019-01-12T09:00:00.000Z');
    sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(2), event, sector, '2019-01-13T09:00:00.000Z');
    sinon.assert.calledOnceWithExactly(insertMany, repeatedEvents.slice(0, 2));
    SinonMongoose.calledWithExactly(
      customerFindOne,
      [
        { query: 'findOne', args: [{ _id: event.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }] },
        { query: 'lean' },
      ]
    );
  });

  [INTERNAL_HOUR, UNAVAILABILITY].forEach((type) => {
    it(`should not check if customer is stopped if event is ${type} and not intervention`, async () => {
      const sector = new ObjectID();
      const event = {
        type,
        startDate: '2019-01-10T09:00:00.000Z',
        endDate: '2019-01-10T11:00:00.000Z',
      };

      const range = ['2019-01-11T09:00:00.000Z', '2019-01-12T09:00:00.000Z', '2019-01-13T09:00:00.000Z'];
      const repeatedEvents = [
        new Event({ company: new ObjectID(), startDate: range[0] }),
        new Event({ company: new ObjectID(), startDate: range[1] }),
        new Event({ company: new ObjectID(), startDate: range[2] }),
      ];

      formatRepeatedPayload.onCall(0).returns(repeatedEvents[0]);
      formatRepeatedPayload.onCall(1).returns(repeatedEvents[1]);
      formatRepeatedPayload.onCall(2).returns(repeatedEvents[2]);

      await EventsRepetitionHelper.createRepeatedEvents(event, range, sector, false);

      sinon.assert.calledOnceWithExactly(insertMany, repeatedEvents);
      sinon.assert.notCalled(customerFindOne);
    });
  });
});

describe('createRepetitionsEveryDay', () => {
  let createRepeatedEvents;
  let dayDiff;
  beforeEach(() => {
    createRepeatedEvents = sinon.stub(EventsRepetitionHelper, 'createRepeatedEvents');
    dayDiff = sinon.stub(DatesHelper, 'dayDiff');
  });
  afterEach(() => {
    createRepeatedEvents.restore();
    dayDiff.restore();
  });

  it('should create repetition every day from today', async () => {
    const sector = new ObjectID();
    const event = {
      startDate: '2019-01-10T09:00:00.000Z',
      endDate: '2019-01-10T11:00:00.000Z',
      customer: new ObjectID(),
    };
    const range = Array.from(
      moment().range(moment('2019-01-11T09:00:00.000Z'), moment('2019-04-10T09:00:00.000Z')).by('days')
    );

    dayDiff.returns(0);

    await EventsRepetitionHelper.createRepetitionsEveryDay(event, sector);

    sinon.assert.calledOnceWithExactly(
      createRepeatedEvents,
      event,
      sinon.match(calledRange => JSON.stringify(calledRange) === JSON.stringify(range)),
      sector,
      false
    );
  });

  it('should create repetition every day with first event in the past', async () => {
    const sector = new ObjectID();
    const event = {
      startDate: '2019-01-10T09:00:00.000Z',
      endDate: '2019-01-10T11:00:00.000Z',
      customer: new ObjectID(),
    };
    const range = Array.from(
      moment().range(moment('2019-01-11T09:00:00.000Z'), moment('2019-04-14T09:00:00.000Z')).by('days')
    );

    dayDiff.returns(4);

    await EventsRepetitionHelper.createRepetitionsEveryDay(event, sector);

    sinon.assert.calledOnceWithExactly(
      createRepeatedEvents,
      event,
      sinon.match(calledRange => JSON.stringify(calledRange) === JSON.stringify(range)),
      sector,
      false
    );
  });
});

describe('createRepetitionsEveryWeekDay', () => {
  let createRepeatedEvents;
  let dayDiff;
  beforeEach(() => {
    createRepeatedEvents = sinon.stub(EventsRepetitionHelper, 'createRepeatedEvents');
    dayDiff = sinon.stub(DatesHelper, 'dayDiff');
  });
  afterEach(() => {
    createRepeatedEvents.restore();
    dayDiff.restore();
  });

  it('should create repetition every week day with first event in the future', async () => {
    const sector = new ObjectID();
    const event = {
      startDate: '2019-01-10T09:00:00.000Z',
      endDate: '2019-01-10T11:00:00.000Z',
      customer: new ObjectID(),
    };
    const range = Array.from(
      moment().range(moment('2019-01-11T09:00:00.000Z'), moment('2019-04-10T09:00:00.000Z')).by('days')
    );

    dayDiff.returns(-3);

    await EventsRepetitionHelper.createRepetitionsEveryWeekDay(event, sector);

    sinon.assert.calledOnceWithExactly(
      createRepeatedEvents,
      event,
      sinon.match(calledRange => JSON.stringify(calledRange) === JSON.stringify(range)),
      sector,
      true
    );
  });

  it('should create repetition every week day with first event in the past', async () => {
    const sector = new ObjectID();
    const event = {
      startDate: '2019-01-10T09:00:00.000Z',
      endDate: '2019-01-10T11:00:00.000Z',
      customer: new ObjectID(),
    };
    const range = Array.from(
      moment().range(moment('2019-01-11T09:00:00.000Z'), moment('2019-04-11T09:00:00.000Z')).by('days')
    );

    dayDiff.returns(1);

    await EventsRepetitionHelper.createRepetitionsEveryWeekDay(event, sector);

    sinon.assert.calledOnceWithExactly(
      createRepeatedEvents,
      event,
      sinon.match(calledRange => JSON.stringify(calledRange) === JSON.stringify(range)),
      sector,
      true
    );
  });
});

describe('createRepetitionsByWeek', () => {
  let createRepeatedEvents;
  let dayDiff;
  beforeEach(() => {
    createRepeatedEvents = sinon.stub(EventsRepetitionHelper, 'createRepeatedEvents');
    dayDiff = sinon.stub(DatesHelper, 'dayDiff');
  });
  afterEach(() => {
    createRepeatedEvents.restore();
    dayDiff.restore();
  });

  it('should create repetition by week with first event in the future', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00.000Z', endDate: '2019-01-10T11:00:00Z', customer: new ObjectID() };
    const range = Array.from(
      moment().range(moment('2019-01-17T09:00:00.000Z'), moment('2019-04-10T10:00:00.000Z')).by('weeks', { step: 1 })
    );

    dayDiff.returns(-7);

    await EventsRepetitionHelper.createRepetitionsByWeek(event, sector, 1);

    sinon.assert.calledOnceWithExactly(
      createRepeatedEvents,
      event,
      sinon.match(calledRange => JSON.stringify(calledRange) === JSON.stringify(range)),
      sector,
      false
    );
  });

  it('should create repetition by week with first event in the past', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00.000Z', endDate: '2019-01-10T11:00:00Z', customer: new ObjectID() };
    const range = Array.from(
      moment().range(moment('2019-01-17T09:00:00.000Z'), moment('2019-04-20T10:00:00.000Z')).by('weeks', { step: 1 })
    );

    dayDiff.returns(10);

    await EventsRepetitionHelper.createRepetitionsByWeek(event, sector, 1);

    sinon.assert.calledOnceWithExactly(
      createRepeatedEvents,
      event,
      sinon.match(calledRange => JSON.stringify(calledRange) === JSON.stringify(range)),
      sector,
      false
    );
  });

  it('should create repetition every two weeks from today', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00.000Z', endDate: '2019-01-10T11:00:00Z', customer: new ObjectID() };

    const range = Array.from(
      moment().range(moment('2019-01-24T09:00:00.000Z'), moment('2019-04-10T10:00:00.000Z')).by('weeks', { step: 2 })
    );

    dayDiff.returns(0);

    await EventsRepetitionHelper.createRepetitionsByWeek(event, sector, 2);

    sinon.assert.calledOnceWithExactly(
      createRepeatedEvents,
      event,
      sinon.match(calledRange => JSON.stringify(calledRange) === JSON.stringify(range)),
      sector,
      false
    );
  });
});

describe('createRepetitions', () => {
  let updateOne;
  let createRepetitionsEveryDay;
  let createRepetitionsEveryWeekDay;
  let createRepetitionsByWeek;
  let saveRepetition;
  let findOne;
  beforeEach(() => {
    updateOne = sinon.stub(Event, 'updateOne');
    createRepetitionsEveryDay = sinon.stub(EventsRepetitionHelper, 'createRepetitionsEveryDay');
    createRepetitionsEveryWeekDay = sinon.stub(EventsRepetitionHelper, 'createRepetitionsEveryWeekDay');
    createRepetitionsByWeek = sinon.stub(EventsRepetitionHelper, 'createRepetitionsByWeek');
    saveRepetition = sinon.stub(Repetition.prototype, 'save');
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    updateOne.restore();
    createRepetitionsEveryDay.restore();
    createRepetitionsEveryWeekDay.restore();
    createRepetitionsByWeek.restore();
    saveRepetition.restore();
    findOne.restore();
  });

  it('should call updateOne', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const payload = { _id: '1234567890', repetition: { frequency: 'every_day', parentId: '0987654321' } };
    const event = new Event({ repetition: { frequency: EVERY_WEEK }, company: new ObjectID(), auxiliary: auxiliaryId });

    findOne.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));

    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
    sinon.assert.called(updateOne);
    sinon.assert.called(saveRepetition);
  });

  it('should call createRepetitionsEveryDay', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const payload = { _id: '1234567890', repetition: { frequency: 'every_day', parentId: '0987654321' } };
    const event = new Event({ company: new ObjectID(), auxiliary: auxiliaryId });

    findOne.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));

    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
    sinon.assert.notCalled(updateOne);
    sinon.assert.called(createRepetitionsEveryDay);
    sinon.assert.calledWithExactly(createRepetitionsEveryDay, payload, sectorId);
    sinon.assert.called(saveRepetition);
  });

  it('should call createRepetitionsEveryWeekDay', async () => {
    const sectorId = new ObjectID();
    const credentials = { company: { _id: new ObjectID() } };
    const payload = { _id: '1234567890', repetition: { frequency: 'every_week_day', parentId: '0987654321' } };
    const event = new Event({ company: new ObjectID(), sector: sectorId });

    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

    sinon.assert.notCalled(findOne);
    sinon.assert.notCalled(updateOne);
    sinon.assert.called(createRepetitionsEveryWeekDay);
    sinon.assert.calledWithExactly(createRepetitionsEveryWeekDay, payload, sectorId);
    sinon.assert.called(saveRepetition);
  });

  it('should call createRepetitionsByWeek to repeat every week', async () => {
    const sectorId = new ObjectID();
    const credentials = { company: { _id: new ObjectID() } };
    const payload = { _id: '1234567890', repetition: { frequency: 'every_week', parentId: '0987654321' } };
    const event = new Event({ company: new ObjectID(), sector: sectorId });

    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

    sinon.assert.notCalled(findOne);
    sinon.assert.notCalled(updateOne);
    sinon.assert.calledWithExactly(createRepetitionsByWeek, payload, sectorId, 1);
    sinon.assert.called(saveRepetition);
  });

  it('should call createRepetitionsByWeek to repeat every two weeks', async () => {
    const sectorId = new ObjectID();
    const credentials = { company: { _id: new ObjectID() } };
    const payload = { _id: '1234567890', repetition: { frequency: 'every_two_weeks', parentId: '0987654321' } };
    const event = new Event({ company: new ObjectID(), sector: sectorId });

    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

    sinon.assert.notCalled(findOne);
    sinon.assert.notCalled(updateOne);
    sinon.assert.calledWithExactly(createRepetitionsByWeek, payload, sectorId, 2);
    sinon.assert.called(saveRepetition);
  });
});

describe('updateRepetition', () => {
  let hasConflicts;
  let isAbsent;
  let find;
  let updateOne;
  let deleteOne;
  let updateRepetitions;
  let findOneUser;
  let formatEditionPayload;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    isAbsent = sinon.stub(CustomerAbsencesHelper, 'isAbsent');
    find = sinon.stub(Event, 'find');
    updateOne = sinon.stub(Event, 'updateOne');
    deleteOne = sinon.stub(Event, 'deleteOne');
    updateRepetitions = sinon.stub(RepetitionHelper, 'updateRepetitions');
    findOneUser = sinon.stub(User, 'findOne');
    formatEditionPayload = sinon.stub(EventsHelper, 'formatEditionPayload');
  });
  afterEach(() => {
    hasConflicts.restore();
    isAbsent.restore();
    find.restore();
    updateOne.restore();
    deleteOne.restore();
    updateRepetitions.restore();
    findOneUser.restore();
    formatEditionPayload.restore();
  });

  it('should update repetition', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectID();
    const customerId = new ObjectID();
    const event = {
      repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
      startDate: '2019-03-23T09:00:00.000Z',
      type: INTERVENTION,
      customer: customerId,
      sector: new ObjectID(),
      auxiliary: auxiliaryId,
    };
    const payload = {
      startDate: '2019-03-23T10:00:00.000Z',
      endDate: '2019-03-23T11:00:00.000Z',
      auxiliary: '1234567890',
    };
    const events = [
      {
        repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
        startDate: '2019-03-23T09:00:00.000Z',
        endDate: '2019-03-23T11:00:00.000Z',
        _id: 'asdfghjk',
      },
      {
        repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
        startDate: '2019-03-24T09:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        type: INTERVENTION,
        customer: customerId,
        _id: '123456',
      },
      {
        repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
        startDate: '2019-03-25T09:00:00.000Z',
        endDate: '2019-03-25T11:00:00.000Z',
        _id: '654321',
      },
    ];

    find.returns(SinonMongoose.stubChainedQueries([events], ['lean']));
    hasConflicts.returns(false);
    isAbsent.returns(false);

    await EventsRepetitionHelper.updateRepetition(event, payload, credentials);

    sinon.assert.notCalled(findOneUser);
    SinonMongoose.calledWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{
            'repetition.parentId': 'qwertyuiop',
            'repetition.frequency': { $not: { $eq: 'never' } },
            startDate: { $gte: new Date('2019-03-23T09:00:00.000Z') },
            company: credentials.company._id,
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledThrice(hasConflicts);
    sinon.assert.notCalled(deleteOne);
    sinon.assert.calledThrice(updateOne);
    sinon.assert.calledThrice(formatEditionPayload);
    sinon.assert.calledWithExactly(
      formatEditionPayload.getCall(0),
      events[0],
      {
        startDate: '2019-03-23T10:00:00.000Z',
        endDate: '2019-03-23T11:00:00.000Z',
        auxiliary: '1234567890',
        _id: 'asdfghjk',
      },
      false
    );
    sinon.assert.calledWithExactly(updateRepetitions, payload, 'qwertyuiop');
    sinon.assert.calledWithExactly(isAbsent, events[1].customer, events[1].startDate);
  });

  it('should unassign intervention in conflict', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const event = {
      repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
      startDate: '2019-03-23T09:00:00.000Z',
      type: INTERVENTION,
      auxiliary: auxiliaryId,
    };
    const payload = {
      startDate: '2019-03-23T10:00:00.000Z',
      endDate: '2019-03-23T11:00:00.000Z',
      auxiliary: '1234567890',
    };
    const events = [
      {
        repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
        startDate: '2019-03-24T09:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        _id: '123456',
      },
    ];

    formatEditionPayload.returns({
      $set: {
        _id: '123456',
        startDate: '2019-03-24T10:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        sector: sectorId,
        'repetition.frequency': 'never',
      },
      $unset: { auxiliary: '' },
    });
    findOneUser.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));
    hasConflicts.returns(true);
    find.returns(SinonMongoose.stubChainedQueries([events], ['lean']));

    await EventsRepetitionHelper.updateRepetition(event, payload, credentials);

    SinonMongoose.calledWithExactly(
      findOneUser,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        {
          query: 'populate',
          args: [{ path: 'sector', select: '_id sector', match: { company: credentials.company._id } }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{
            'repetition.parentId': 'qwertyuiop',
            'repetition.frequency': { $not: { $eq: 'never' } },
            startDate: { $gte: new Date('2019-03-23T09:00:00.000Z') },
            company: credentials.company._id,
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(
      hasConflicts,
      {
        _id: '123456',
        auxiliary: '1234567890',
        startDate: '2019-03-24T10:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        company: companyId,
      }
    );
    sinon.assert.calledWithExactly(
      updateOne,
      { _id: '123456' },
      {
        $set: {
          _id: '123456',
          startDate: '2019-03-24T10:00:00.000Z',
          endDate: '2019-03-24T11:00:00.000Z',
          sector: sectorId,
          'repetition.frequency': 'never',
        },
        $unset: { auxiliary: '' },
      }
    );
    sinon.assert.calledWithExactly(updateRepetitions, payload, 'qwertyuiop');
    sinon.assert.calledOnceWithExactly(
      formatEditionPayload,
      events[0],
      {
        startDate: '2019-03-24T10:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        sector: sectorId,
        _id: '123456',
      },
      true
    );
    sinon.assert.notCalled(deleteOne);
    sinon.assert.notCalled(isAbsent);
  });

  it('should unassign intervention if all the interventions are unassigned', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const event = {
      repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
      startDate: '2019-03-23T09:00:00.000Z',
      type: INTERVENTION,
      auxiliary: auxiliaryId,
    };
    const payload = { startDate: '2019-03-23T10:00:00.000Z', endDate: '2019-03-23T11:00:00.000Z' };
    const events = [
      {
        repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
        startDate: '2019-03-24T09:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        _id: '123456',
      },
    ];

    formatEditionPayload.returns({
      $set: {
        _id: '123456',
        startDate: '2019-03-24T10:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        sector: sectorId,
        'repetition.frequency': 'never',
      },
      $unset: { auxiliary: '' },
    });
    hasConflicts.returns(true);
    findOneUser.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));
    find.returns(SinonMongoose.stubChainedQueries([events], ['lean']));

    await EventsRepetitionHelper.updateRepetition(event, payload, credentials);

    SinonMongoose.calledWithExactly(
      findOneUser,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        {
          query: 'populate',
          args: [{ path: 'sector', select: '_id sector', match: { company: credentials.company._id } }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{
            'repetition.parentId': 'qwertyuiop',
            'repetition.frequency': { $not: { $eq: 'never' } },
            startDate: { $gte: new Date('2019-03-23T09:00:00.000Z') },
            company: companyId,
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(
      hasConflicts,
      { _id: '123456', startDate: '2019-03-24T10:00:00.000Z', endDate: '2019-03-24T11:00:00.000Z', company: companyId }
    );
    sinon.assert.calledWithExactly(
      updateOne,
      { _id: '123456' },
      {
        $set: {
          _id: '123456',
          startDate: '2019-03-24T10:00:00.000Z',
          endDate: '2019-03-24T11:00:00.000Z',
          sector: sectorId,
          'repetition.frequency': 'never',
        },
        $unset: { auxiliary: '' },
      }
    );
    sinon.assert.calledWithExactly(updateRepetitions, payload, 'qwertyuiop');
    sinon.assert.calledOnceWithExactly(
      formatEditionPayload,
      events[0],
      { startDate: '2019-03-24T10:00:00.000Z', endDate: '2019-03-24T11:00:00.000Z', sector: sectorId, _id: '123456' },
      false
    );
    sinon.assert.notCalled(deleteOne);
    sinon.assert.notCalled(isAbsent);
  });

  it('should delete internal hours in conflicts', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const event = {
      repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
      startDate: '2019-03-23T09:00:00',
      type: INTERNAL_HOUR,
      auxiliary: auxiliaryId,
    };
    const payload = { startDate: '2019-03-23T10:00:00.000Z', endDate: '2019-03-23T11:00:00.000Z' };
    const events = [
      {
        repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
        startDate: '2019-03-24T09:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        _id: '123456',
      },
    ];

    hasConflicts.returns(true);
    findOneUser.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));
    find.returns(SinonMongoose.stubChainedQueries([events], ['lean']));

    await EventsRepetitionHelper.updateRepetition(event, payload, credentials);

    SinonMongoose.calledWithExactly(
      findOneUser,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        {
          query: 'populate',
          args: [{ path: 'sector', select: '_id sector', match: { company: credentials.company._id } }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{
            'repetition.parentId': 'qwertyuiop',
            'repetition.frequency': { $not: { $eq: 'never' } },
            startDate: { $gte: new Date('2019-03-23T09:00:00') },
            company: credentials.company._id,
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(
      hasConflicts,
      { _id: '123456', startDate: '2019-03-24T10:00:00.000Z', endDate: '2019-03-24T11:00:00.000Z', company: companyId }
    );
    sinon.assert.notCalled(updateOne);
    sinon.assert.calledWithExactly(deleteOne, { _id: '123456' });
    sinon.assert.calledWithExactly(updateRepetitions, payload, 'qwertyuiop');
    sinon.assert.notCalled(formatEditionPayload);
    sinon.assert.notCalled(isAbsent);
  });
  
  it('should not update an event of a repetition if customer is absent during this period', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectID();
    const customerId = new ObjectID();
    const customerAbsent = new ObjectID();
    const event = {
      repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
      startDate: '2019-03-23T09:00:00.000Z',
      type: INTERVENTION,
      customer: customerId,
      sector: new ObjectID(),
      auxiliary: auxiliaryId,
    };
    const payload = {
      startDate: '2019-03-24T10:00:00.000Z',
      endDate: '2019-03-24T11:00:00.000Z',
      auxiliary: '1234567890',
    };
    const events = [
      {
        repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
        startDate: '2019-03-23T09:00:00.000Z',
        endDate: '2019-03-23T11:00:00.000Z',
        type: INTERVENTION,
        customer: customerId,
        _id: 'asdfghjk',
      },
      {
        repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
        startDate: '2019-03-24T09:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        type: INTERVENTION,
        customer: customerId,
        _id: '123456',
      },
      {
        repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
        startDate: '2019-03-25T09:00:00.000Z',
        endDate: '2019-03-25T11:00:00.000Z',
        type: INTERVENTION,
        customer: customerAbsent,
        _id: '654321',
      },
    ];

    find.returns(SinonMongoose.stubChainedQueries([events], ['lean']));
    hasConflicts.returns(false);
    isAbsent.onCall(0).returns(false);
    isAbsent.onCall(1).returns(false);
    isAbsent.onCall(2).returns(true);

    await EventsRepetitionHelper.updateRepetition(event, payload, credentials);
    
    sinon.assert.notCalled(findOneUser);
    SinonMongoose.calledWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{
            'repetition.parentId': 'qwertyuiop',
            'repetition.frequency': { $not: { $eq: 'never' } },
            startDate: { $gte: new Date('2019-03-23T09:00:00.000Z') },
            company: credentials.company._id,
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledTwice(hasConflicts);
    sinon.assert.notCalled(deleteOne);
    sinon.assert.calledTwice(updateOne);
    sinon.assert.calledTwice(formatEditionPayload);
    sinon.assert.calledWithExactly(updateRepetitions, payload, 'qwertyuiop');
    sinon.assert.calledWithExactly(isAbsent, events[0].customer, events[0].startDate);
    sinon.assert.calledWithExactly(isAbsent, events[1].customer, events[1].startDate);
    sinon.assert.calledWithExactly(isAbsent, events[2].customer, events[2].startDate);
  });
});

describe('deleteRepetition', () => {
  let deleteEventsAndRepetition;
  beforeEach(() => {
    deleteEventsAndRepetition = sinon.stub(EventsHelper, 'deleteEventsAndRepetition');
  });
  afterEach(() => {
    deleteEventsAndRepetition.restore();
  });

  it('should delete repetition', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const parentId = new ObjectID();
    const event = {
      type: INTERVENTION,
      repetition: { frequency: EVERY_WEEK, parentId },
      startDate: '2019-01-21T09:38:18.653Z',
    };
    const query = {
      'repetition.parentId': event.repetition.parentId,
      startDate: { $gte: new Date(event.startDate) },
      company: credentials.company._id,
    };

    await EventsRepetitionHelper.deleteRepetition(event, credentials);

    sinon.assert.calledWithExactly(deleteEventsAndRepetition, query, true, credentials);
  });

  it('should not delete repetition as event is absence', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const event = {
      type: ABSENCE,
      repetition: { frequency: EVERY_WEEK },
      startDate: '2019-01-21T09:38:18.653Z',
    };
    await EventsRepetitionHelper.deleteRepetition(event, credentials);

    sinon.assert.notCalled(deleteEventsAndRepetition);
  });

  it('should not delete repetition as event is not a repetition', async () => {
    try {
      const credentials = { company: { _id: new ObjectID() } };
      const parentId = new ObjectID();
      const event = {
        type: INTERVENTION,
        repetition: { frequency: NEVER, parentId },
        startDate: '2019-01-21T09:38:18.653Z',
      };
      await EventsRepetitionHelper.deleteRepetition(event, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      sinon.assert.notCalled(deleteEventsAndRepetition);
    }
  });

  it('should not delete repetition as event is parentId is missing', async () => {
    try {
      const credentials = { company: { _id: new ObjectID() } };
      const event = {
        type: INTERVENTION,
        repetition: { frequency: EVERY_WEEK },
        startDate: '2019-01-21T09:38:18.653Z',
      };

      await EventsRepetitionHelper.deleteRepetition(event, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      sinon.assert.notCalled(deleteEventsAndRepetition);
    }
  });
});

describe('formatEventBasedOnRepetition', () => {
  let hasConflicts;
  let detachAuxiliaryFromEvent;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    detachAuxiliaryFromEvent = sinon.stub(EventsHelper, 'detachAuxiliaryFromEvent');
  });
  afterEach(() => {
    hasConflicts.restore();
    detachAuxiliaryFromEvent.restore();
  });

  it('should format event based on repetition', async () => {
    const repetition = {
      type: 'intervention',
      customer: new ObjectID(),
      subscription: new ObjectID(),
      auxiliary: new ObjectID(),
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      company: new ObjectID(),
      frequency: 'every_day',
      parentId: new ObjectID(),
      startDate: moment('2019-12-01T09:00:00').toDate(),
      endDate: moment('2019-12-01T10:00:00').toDate(),
    };

    hasConflicts.returns(false);

    const event = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, new Date());

    expect(event).toEqual(expect.objectContaining({
      ...omit(repetition, ['frequency', 'parentId', 'startDate', 'endDate']),
      repetition: { frequency: repetition.frequency, parentId: repetition.parentId },
      startDate: moment().add(90, 'd').set({ hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
      endDate: moment().add(90, 'd').set({ hours: 10, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
    }));
    sinon.assert.notCalled(detachAuxiliaryFromEvent);
  });

  it('should return null if unavailability in conflict', async () => {
    const repetition = {
      type: 'unavailability',
      auxiliary: new ObjectID(),
      company: new ObjectID(),
      frequency: 'every_day',
      parentId: new ObjectID(),
      startDate: moment('2019-12-01T09:00:00').toDate(),
      endDate: moment('2019-12-01T10:00:00').toDate(),
    };

    hasConflicts.returns(true);

    const event = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, new Date());

    expect(event).toBeNull();
    sinon.assert.notCalled(detachAuxiliaryFromEvent);
  });

  it('should format and unassign event based on repetition', async () => {
    const customer = new ObjectID();
    const subscription = new ObjectID();
    const auxiliary = new ObjectID();
    const sector = new ObjectID();
    const company = new ObjectID();
    const parentId = new ObjectID();

    const repetition = {
      type: 'intervention',
      customer,
      subscription,
      auxiliary,
      sector,
      misc: 'note',
      internalHour: 'non',
      address: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      company,
      frequency: 'every_day',
      parentId,
      startDate: moment('2019-12-01T09:00:00').toDate(),
      endDate: moment('2019-12-01T10:00:00').toDate(),
    };

    hasConflicts.returns(true);
    detachAuxiliaryFromEvent.returns({ sector });

    const date = '2020-03-11T00:00:00';
    const event = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, date);

    expect(event).toEqual({ sector });
    sinon.assert.calledOnceWithExactly(
      detachAuxiliaryFromEvent,
      {
        type: 'intervention',
        customer,
        subscription,
        auxiliary,
        sector,
        misc: 'note',
        internalHour: 'non',
        company,
        address: {
          fullAddress: '37 rue de ponthieu 75008 Paris',
          zipCode: '75008',
          city: 'Paris',
          street: '37 rue de Ponthieu',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
        startDate: moment(date).add(90, 'd').set({ hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
        endDate: moment(date).add(90, 'd').set({ hours: 10, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
        repetition: { frequency: 'every_day', parentId },
      },
      repetition.company
    );
  });
});
