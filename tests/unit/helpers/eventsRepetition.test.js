const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const momentRange = require('moment-range');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
const Repetition = require('../../../src/models/Repetition');
const Customer = require('../../../src/models/Customer');
const EventsHelper = require('../../../src/helpers/events');
const EventsRepetitionHelper = require('../../../src/helpers/eventsRepetition');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const RepetitionHelper = require('../../../src/helpers/repetitions');
const {
  INTERVENTION,
  ABSENCE,
  NEVER,
  EVERY_WEEK,
  INTERNAL_HOUR,
} = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

momentRange.extendMoment(moment);

describe('formatRepeatedPayload', () => {
  let hasConflicts;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
  });
  afterEach(() => {
    hasConflicts.restore();
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
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, sector, day);

    expect(result).toBeDefined();
    expect(result.startDate).toEqual(moment('2019-07-17').startOf('d').toDate());
    expect(result.endDate).toEqual(moment('2019-07-18').startOf('d').toDate());
    expect(result.auxiliary).toEqual(auxiliaryId);
    sinon.assert.calledWithExactly(hasConflicts, payload);
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
  });
});

describe('createRepetitionsEveryDay', () => {
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

  it('should create repetition every day', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00.000Z', endDate: '2019-01-10T11:00:00', customer: new ObjectID() };
    const range = Array.from(moment()
      .range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(90, 'd')).by('days'));
    const repeatedEvents = [];

    for (let i = 0; i < 90; i++) {
      const startDate = new Date(event.startDate);
      startDate.setDate(startDate.getDate() + i + 1);
      const repeatedEvent = new Event({ company: new ObjectID(), startDate });
      formatRepeatedPayload.onCall(i).returns(repeatedEvent);
      repeatedEvents.push(repeatedEvent);
    }
    customerFindOne.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

    await EventsRepetitionHelper.createRepetitionsEveryDay(event, sector);

    sinon.assert.callCount(formatRepeatedPayload, 90);
    sinon.assert.callCount(insertMany, 1);
    for (let i = 0; i < 90; i++) {
      sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(i), event, sector, range[i]);
    }
    sinon.assert.calledOnceWithExactly(insertMany, repeatedEvents);
    SinonMongoose.calledWithExactly(
      customerFindOne,
      [
        { query: 'findOne', args: [{ _id: event.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }] },
        { query: 'lean' },
      ]
    );
  });

  it('should not create repetition after stopping date', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00.000Z', endDate: '2019-01-10T11:00:00', customer: new ObjectID() };
    const range = Array.from(moment()
      .range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(90, 'd')).by('days'));
    const repeatedEvents = [];

    for (let i = 0; i < 3; i++) {
      const startDate = new Date(event.startDate);
      startDate.setDate(startDate.getDate() + i + 1);
      const repeatedEvent = new Event({ company: new ObjectID(), startDate });
      formatRepeatedPayload.onCall(i).returns(repeatedEvent);
      if (repeatedEvent.startDate < new Date('2019-01-12T11:00:00Z')) repeatedEvents.push(repeatedEvent);
    }
    customerFindOne.returns(
      SinonMongoose.stubChainedQueries([{ _id: event.customer, stoppedAt: new Date('2019-01-12T11:00:00Z') }], ['lean'])
    );

    await EventsRepetitionHelper.createRepetitionsEveryDay(event, sector);

    sinon.assert.callCount(formatRepeatedPayload, 3);
    sinon.assert.callCount(insertMany, 1);
    for (let i = 0; i < 3; i++) {
      sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(i), event, sector, range[i]);
    }
    sinon.assert.calledOnceWithExactly(insertMany, repeatedEvents);
    SinonMongoose.calledWithExactly(
      customerFindOne,
      [
        { query: 'findOne', args: [{ _id: event.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('createRepetitionsEveryWeekDay', () => {
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

  it('should create repetition every week day', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00', endDate: '2019-01-10T11:00:00' };
    const range = Array.from(moment()
      .range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(90, 'd')).by('days'));
    const repeatedEvents = [];

    let callCount = 0;
    for (let i = 0; i < 90; i++) {
      const startDate = new Date(event.startDate);
      startDate.setDate(startDate.getDate() + i + 1);
      const repeatedEvent = new Event({ company: new ObjectID(), startDate });
      if (![0, 6].includes(moment(range[i]).day())) {
        formatRepeatedPayload.onCall(callCount).returns(repeatedEvent);
        repeatedEvents.push(repeatedEvent);
        callCount += 1;
      }
    }
    customerFindOne.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

    await EventsRepetitionHelper.createRepetitionsEveryWeekDay(event, sector);

    sinon.assert.callCount(formatRepeatedPayload, 64);
    sinon.assert.callCount(insertMany, 1);
    callCount = 0;
    for (let i = 0; i < 90; i++) {
      if (![0, 6].includes(moment(range[i]).day())) {
        sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(callCount), event, sector, range[i]);
        callCount += 1;
      }
    }
    sinon.assert.calledOnceWithExactly(insertMany, repeatedEvents);
    SinonMongoose.calledWithExactly(
      customerFindOne,
      [
        { query: 'findOne', args: [{ _id: event.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }] },
        { query: 'lean' },
      ]
    );
  });

  it('should not create repetition after stopping date', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00', endDate: '2019-01-10T11:00:00' };
    const range = Array.from(moment()
      .range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(90, 'd')).by('days'));
    const repeatedEvents = [];

    let callCount = 0;
    for (let i = 0; i < 4; i++) {
      const startDate = new Date(event.startDate);
      startDate.setDate(startDate.getDate() + i + 1);
      const repeatedEvent = new Event({ company: new ObjectID(), startDate });
      if (![0, 6].includes(moment(range[i]).day())) {
        formatRepeatedPayload.onCall(callCount).returns(repeatedEvent);
        if (repeatedEvent.startDate < new Date('2019-01-12T11:00:00Z')) repeatedEvents.push(repeatedEvent);
        callCount += 1;
      }
    }
    customerFindOne.returns(
      SinonMongoose.stubChainedQueries([{ _id: event.customer, stoppedAt: new Date('2019-01-12T11:00:00Z') }], ['lean'])
    );

    await EventsRepetitionHelper.createRepetitionsEveryWeekDay(event, sector);

    sinon.assert.callCount(formatRepeatedPayload, 2);
    sinon.assert.callCount(insertMany, 1);
    callCount = 0;
    for (let i = 0; i < 4; i++) {
      if (![0, 6].includes(moment(range[i]).day())) {
        sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(callCount), event, sector, range[i]);
        callCount += 1;
      }
    }
    sinon.assert.calledOnceWithExactly(insertMany, repeatedEvents);
    SinonMongoose.calledWithExactly(
      customerFindOne,
      [
        { query: 'findOne', args: [{ _id: event.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('createRepetitionsByWeek', () => {
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

  it('should create repetition every week', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00', endDate: '2019-01-10T11:00:00' };
    const range = Array.from(moment()
      .range(moment(event.startDate).add(1, 'w'), moment(event.startDate).add(90, 'd')).by('weeks', { step: 1 }));
    const repeatedEvents = [];

    for (let i = 0; i < 12; i++) {
      const startDate = new Date(event.startDate);
      startDate.setDate(startDate.getDate() + i + 1);
      const repeatedEvent = new Event({ company: new ObjectID(), startDate });
      formatRepeatedPayload.onCall(i).returns(repeatedEvent);
      repeatedEvents.push(repeatedEvent);
    }
    customerFindOne.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

    await EventsRepetitionHelper.createRepetitionsByWeek(event, sector, 1);

    sinon.assert.callCount(formatRepeatedPayload, 12);
    sinon.assert.callCount(insertMany, 1);
    for (let i = 0; i < 12; i++) {
      sinon.assert.calledWithExactly(formatRepeatedPayload.getCall(i), event, sector, range[i]);
    }
    sinon.assert.calledOnceWithExactly(insertMany, repeatedEvents);
    SinonMongoose.calledWithExactly(
      customerFindOne,
      [
        { query: 'findOne', args: [{ _id: event.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }] },
        { query: 'lean' },
      ]
    );
  });

  it('should not create repetition after stopping date', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00', endDate: '2019-01-10T11:00:00' };
    const range = Array.from(moment()
      .range(moment(event.startDate).add(1, 'w'), moment(event.startDate).add(90, 'd')).by('weeks', { step: 1 }));
    const repeatedEvents = [];

    const startDate = new Date(event.startDate);
    startDate.setDate(startDate.getDate() + 7);
    const repeatedEvent = new Event({ company: new ObjectID(), startDate });
    formatRepeatedPayload.returns(repeatedEvent);
    if (repeatedEvent.startDate < new Date('2019-01-12T11:00:00Z')) repeatedEvents.push(repeatedEvent);

    customerFindOne.returns(
      SinonMongoose.stubChainedQueries([{ _id: event.customer, stoppedAt: new Date('2019-01-12T11:00:00Z') }], ['lean'])
    );

    await EventsRepetitionHelper.createRepetitionsByWeek(event, sector, 1);

    sinon.assert.callCount(formatRepeatedPayload, 1);
    sinon.assert.callCount(insertMany, 1);
    sinon.assert.calledOnceWithExactly(formatRepeatedPayload, event, sector, range[0]);
    sinon.assert.calledOnceWithExactly(insertMany, repeatedEvents);
    SinonMongoose.calledWithExactly(
      customerFindOne,
      [
        { query: 'findOne', args: [{ _id: event.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }] },
        { query: 'lean' },
      ]
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
  let find;
  let updateOne;
  let updateRepetitions;
  let findOneUser;
  let formatEditionPayload;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    find = sinon.stub(Event, 'find');
    updateOne = sinon.stub(Event, 'updateOne');
    updateRepetitions = sinon.stub(RepetitionHelper, 'updateRepetitions');
    findOneUser = sinon.stub(User, 'findOne');
    formatEditionPayload = sinon.stub(EventsHelper, 'formatEditionPayload');
  });
  afterEach(() => {
    hasConflicts.restore();
    find.restore();
    updateOne.restore();
    updateRepetitions.restore();
    findOneUser.restore();
    formatEditionPayload.restore();
  });

  it('should update repetition', async () => {
    const auxiliaryId = new ObjectID();
    const event = {
      repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
      startDate: '2019-03-23T09:00:00.000Z',
      type: INTERVENTION,
      sector: new ObjectID(),
      auxiliary: auxiliaryId,
    };
    const credentials = { company: { _id: new ObjectID() } };
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
  });

  it('should unassign intervention in conflict', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
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

    const credentials = { company: { _id: new ObjectID() } };
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
        company: credentials.company._id,
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
  });

  it('should unassign intervention if all the interventions are unassigned', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
    const event = {
      repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
      startDate: '2019-03-23T09:00:00.000Z',
      type: INTERVENTION,
      auxiliary: auxiliaryId,
    };
    const payload = {
      startDate: '2019-03-23T10:00:00.000Z',
      endDate: '2019-03-23T11:00:00.000Z',
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
    hasConflicts.returns(true);
    findOneUser.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));
    find.returns(SinonMongoose.stubChainedQueries([events], ['lean']));

    const credentials = { company: { _id: new ObjectID() } };
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
        startDate: '2019-03-24T10:00:00.000Z',
        endDate: '2019-03-24T11:00:00.000Z',
        company: credentials.company._id,
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
      false
    );
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
    const credentials = { company: { _id: new ObjectID() } };
    const parentId = new ObjectID();
    const event = {
      type: INTERVENTION,
      repetition: {
        frequency: NEVER,
        parentId,
      },
      startDate: '2019-01-21T09:38:18.653Z',
    };
    await EventsRepetitionHelper.deleteRepetition(event, credentials);

    sinon.assert.notCalled(deleteEventsAndRepetition);
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
