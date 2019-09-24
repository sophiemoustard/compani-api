const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Event = require('../../../src/models/Event');
const Repetition = require('../../../src/models/Repetition');
const EventsRepetitionHelper = require('../../../src/helpers/eventsRepetition');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const RepetitionHelper = require('../../../src/helpers/repetitions');
const EventHistoriesHelper = require('../../../src/helpers/eventHistories');
const {
  INTERVENTION,
  ABSENCE,
  NEVER,
  EVERY_WEEK,
} = require('../../../src/helpers/constants');

require('sinon-mongoose');

describe('formatRepeatedPayload', () => {
  let hasConflicts;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
  });
  afterEach(() => {
    hasConflicts.restore();
  });

  it('should format event with auxiliary', async () => {
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const auxiliaryId = new ObjectID();
    const event = {
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      auxiliary: auxiliaryId,
    };

    hasConflicts.returns(false);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, day);

    expect(result).toBeDefined();
    expect(result.startDate).toEqual(moment('2019-07-17').startOf('d').toDate());
    expect(result.endDate).toEqual(moment('2019-07-18').startOf('d').toDate());
    expect(result.auxiliary).toEqual(auxiliaryId);
  });

  it('should format intervention without auxiliary', async () => {
    const auxiliaryId = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const event = {
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      auxiliary: auxiliaryId,
      type: 'intervention',
    };

    hasConflicts.returns(true);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, day);

    expect(result).toBeDefined();
    expect(result.startDate).toEqual(moment('2019-07-17').startOf('d').toDate());
    expect(result.endDate).toEqual(moment('2019-07-18').startOf('d').toDate());
    expect(result.auxiliary).not.toBeDefined();
  });

  it('should format internal hour with auxiliary', async () => {
    const auxiliaryId = new ObjectID();
    const day = moment('2019-07-17', 'YYYY-MM-DD');
    const event = {
      startDate: moment('2019-07-14').startOf('d'),
      endDate: moment('2019-07-15').startOf('d'),
      auxiliary: auxiliaryId,
      type: 'internalHour',
    };

    hasConflicts.returns(true);
    const result = await EventsRepetitionHelper.formatRepeatedPayload(event, day);

    expect(result).toBeDefined();
    expect(result.auxiliary).toBeDefined();
  });
});

describe('createRepetitionsEveryDay', () => {
  let formatRepeatedPayload;
  let insertMany;
  beforeEach(() => {
    formatRepeatedPayload = sinon.stub(EventsRepetitionHelper, 'formatRepeatedPayload');
    insertMany = sinon.stub(Event, 'insertMany');
  });
  afterEach(() => {
    formatRepeatedPayload.restore();
    insertMany.restore();
  });

  it('should create repetition every day', async () => {
    const event = { startDate: '2019-01-10T09:00:00.000Z', endDate: '2019-01-10T11:00:00' };
    formatRepeatedPayload.returns(new Event());
    await EventsRepetitionHelper.createRepetitionsEveryDay(event);

    sinon.assert.callCount(formatRepeatedPayload, 90);
    sinon.assert.callCount(insertMany, 1);
  });
});

describe('createRepetitionsEveryWeekDay', () => {
  let formatRepeatedPayload;
  let insertMany;
  beforeEach(() => {
    formatRepeatedPayload = sinon.stub(EventsRepetitionHelper, 'formatRepeatedPayload');
    insertMany = sinon.stub(Event, 'insertMany');
  });
  afterEach(() => {
    formatRepeatedPayload.restore();
    insertMany.restore();
  });

  it('should create repetition every day', async () => {
    const event = { startDate: '2019-01-10T09:00:00', endDate: '2019-01-10T11:00:00' };
    formatRepeatedPayload.returns(new Event());
    await EventsRepetitionHelper.createRepetitionsEveryWeekDay(event);

    sinon.assert.callCount(formatRepeatedPayload, 64);
    sinon.assert.callCount(insertMany, 1);
  });
});

describe('createRepetitionsByWeek', () => {
  let formatRepeatedPayload;
  let insertMany;
  beforeEach(() => {
    formatRepeatedPayload = sinon.stub(EventsRepetitionHelper, 'formatRepeatedPayload');
    insertMany = sinon.stub(Event, 'insertMany');
  });
  afterEach(() => {
    formatRepeatedPayload.restore();
    insertMany.restore();
  });

  it('should create repetition every day', async () => {
    const event = { startDate: '2019-01-10T09:00:00', endDate: '2019-01-10T11:00:00' };
    formatRepeatedPayload.returns(new Event());
    await EventsRepetitionHelper.createRepetitionsByWeek(event);

    sinon.assert.callCount(formatRepeatedPayload, 13);
    sinon.assert.callCount(insertMany, 1);
  });
});

describe('createRepetitions', () => {
  let findOneAndUpdate;
  let createRepetitionsEveryDay;
  let createRepetitionsEveryWeekDay;
  let createRepetitionsByWeek;
  let saveRepetition;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(Event, 'findOneAndUpdate');
    createRepetitionsEveryDay = sinon.stub(EventsRepetitionHelper, 'createRepetitionsEveryDay');
    createRepetitionsEveryWeekDay = sinon.stub(EventsRepetitionHelper, 'createRepetitionsEveryWeekDay');
    createRepetitionsByWeek = sinon.stub(EventsRepetitionHelper, 'createRepetitionsByWeek');
    saveRepetition = sinon.stub(Repetition.prototype, 'save');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
    createRepetitionsEveryDay.restore();
    createRepetitionsEveryWeekDay.restore();
    createRepetitionsByWeek.restore();
    saveRepetition.restore();
  });

  it('should call createRepetitionsEveryDay', async () => {
    const payload = { _id: '1234567890', repetition: { frequency: 'every_day', parentId: '0987654321' } };
    const event = new Event({ repetition: { frequency: EVERY_WEEK } });
    await EventsRepetitionHelper.createRepetitions(event, payload);

    sinon.assert.called(findOneAndUpdate);
    sinon.assert.called(saveRepetition);
  });

  it('should call createRepetitionsEveryDay', async () => {
    const payload = { _id: '1234567890', repetition: { frequency: 'every_day', parentId: '0987654321' } };
    const event = new Event();
    await EventsRepetitionHelper.createRepetitions(event, payload);

    sinon.assert.notCalled(findOneAndUpdate);
    sinon.assert.called(createRepetitionsEveryDay);
    sinon.assert.called(saveRepetition);
  });

  it('should call createRepetitionsEveryWeekDay', async () => {
    const payload = { _id: '1234567890', repetition: { frequency: 'every_week_day', parentId: '0987654321' } };
    const event = new Event();
    await EventsRepetitionHelper.createRepetitions(event, payload);

    sinon.assert.notCalled(findOneAndUpdate);
    sinon.assert.called(createRepetitionsEveryWeekDay);
    sinon.assert.called(saveRepetition);
  });

  it('should call createRepetitionsByWeek to repeat every week', async () => {
    const payload = { _id: '1234567890', repetition: { frequency: 'every_week', parentId: '0987654321' } };
    const event = new Event();
    await EventsRepetitionHelper.createRepetitions(event, payload);

    sinon.assert.notCalled(findOneAndUpdate);
    sinon.assert.calledWith(createRepetitionsByWeek, payload, 1);
    sinon.assert.called(saveRepetition);
  });

  it('should call createRepetitionsByWeek to repeat every two weeks', async () => {
    const payload = { _id: '1234567890', repetition: { frequency: 'every_two_weeks', parentId: '0987654321' } };
    const event = new Event();
    await EventsRepetitionHelper.createRepetitions(event, payload);

    sinon.assert.notCalled(findOneAndUpdate);
    sinon.assert.calledWith(createRepetitionsByWeek, payload, 2);
    sinon.assert.called(saveRepetition);
  });
});

describe('updateRepetition', () => {
  let hasConflicts;
  let findEvent;
  let findOneAndUpdateEvent;
  let updateRepetitions;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    findEvent = sinon.stub(Event, 'find');
    findOneAndUpdateEvent = sinon.stub(Event, 'findOneAndUpdate');
    updateRepetitions = sinon.stub(RepetitionHelper, 'updateRepetitions');
  });
  afterEach(() => {
    hasConflicts.restore();
    findEvent.restore();
    findOneAndUpdateEvent.restore();
    updateRepetitions.restore();
  });

  it('should update repetition', async () => {
    const event = { repetition: { parentId: 'qwertyuiop', frequency: 'every_day' }, startDate: '2019-03-23T09:00:00.000Z', type: INTERVENTION };
    const payload = { startDate: '2019-03-23T10:00:00.000Z', endDate: '2019-03-23T11:00:00.000Z', auxiliary: '1234567890' };
    const events = [
      { repetition: { parentId: 'qwertyuiop', frequency: 'every_day' }, startDate: '2019-03-23T09:00:00.000Z', endDate: '2019-03-23T11:00:00.000Z', _id: 'asdfghjk' },
      { repetition: { parentId: 'qwertyuiop', frequency: 'every_day' }, startDate: '2019-03-24T09:00:00.000Z', endDate: '2019-03-24T11:00:00.000Z', _id: '123456' },
      { repetition: { parentId: 'qwertyuiop', frequency: 'every_day' }, startDate: '2019-03-25T09:00:00.000Z', endDate: '2019-03-25T11:00:00.000Z', _id: '654321' },
    ];
    findEvent.returns(events);
    hasConflicts.returns(false);

    await EventsRepetitionHelper.updateRepetition(event, payload);

    sinon.assert.calledWith(findEvent, { 'repetition.parentId': 'qwertyuiop', startDate: { $gte: new Date('2019-03-23T09:00:00.000Z') } });
    sinon.assert.calledThrice(hasConflicts);
    sinon.assert.calledThrice(findOneAndUpdateEvent);
    sinon.assert.calledWith(updateRepetitions, payload, 'qwertyuiop');
  });

  it('should unassign intervention in conflict', async () => {
    const event = { repetition: { parentId: 'qwertyuiop', frequency: 'every_day' }, startDate: '2019-03-23T09:00:00.000Z', type: INTERVENTION };
    const payload = { startDate: '2019-03-23T10:00:00.000Z', endDate: '2019-03-23T11:00:00.000Z', auxiliary: '1234567890' };
    const events = [
      { repetition: { parentId: 'qwertyuiop', frequency: 'every_day' }, startDate: '2019-03-24T09:00:00.000Z', endDate: '2019-03-24T11:00:00.000Z', _id: '123456' },
    ];
    findEvent.returns(events);
    hasConflicts.returns(true);

    await EventsRepetitionHelper.updateRepetition(event, payload);

    sinon.assert.calledWith(
      hasConflicts,
      { _id: '123456', auxiliary: '1234567890', startDate: '2019-03-24T10:00:00.000Z', endDate: '2019-03-24T11:00:00.000Z' }
    );
    sinon.assert.calledWith(
      findOneAndUpdateEvent,
      { _id: '123456' },
      { $set: { _id: '123456', startDate: '2019-03-24T10:00:00.000Z', endDate: '2019-03-24T11:00:00.000Z' }, $unset: { auxiliary: '', repetition: '' } }
    );
    sinon.assert.calledWith(updateRepetitions, payload, 'qwertyuiop');
  });
});

describe('deleteRepetition', () => {
  let createEventHistoryOnDelete;
  let deleteMany;
  let deleteOne;
  const credentials = { _id: (new ObjectID()).toHexString() };
  beforeEach(() => {
    createEventHistoryOnDelete = sinon.stub(EventHistoriesHelper, 'createEventHistoryOnDelete');
    deleteMany = sinon.stub(Event, 'deleteMany');
    deleteOne = sinon.stub(Repetition, 'deleteOne');
  });
  afterEach(() => {
    createEventHistoryOnDelete.restore();
    deleteMany.restore();
    deleteOne.restore();
  });

  it('should delete repetition', async () => {
    const parentId = new ObjectID();
    const event = {
      type: INTERVENTION,
      repetition: { frequency: EVERY_WEEK, parentId },
      startDate: '2019-01-21T09:38:18.653Z',
    };
    const result = await EventsRepetitionHelper.deleteRepetition(event, credentials);

    expect(result).toEqual(event);
    sinon.assert.calledWith(createEventHistoryOnDelete, event, credentials);
    sinon.assert.calledWith(
      deleteMany,
      {
        'repetition.parentId': parentId,
        startDate: { $gte: new Date(event.startDate) },
        $or: [{ isBilled: false }, { isBilled: { $exists: false } }],
      }
    );
    sinon.assert.calledWith(deleteOne, { parentId });
  });

  it('should not delete repetition as event is absence', async () => {
    const event = {
      type: ABSENCE,
      repetition: { frequency: EVERY_WEEK },
      startDate: '2019-01-21T09:38:18.653Z',
    };
    const result = await EventsRepetitionHelper.deleteRepetition(event, credentials);

    expect(result).toEqual(event);
    sinon.assert.notCalled(createEventHistoryOnDelete);
    sinon.assert.notCalled(deleteMany);
    sinon.assert.notCalled(deleteOne);
  });

  it('should not delete repetition as event is not a repetition', async () => {
    const parentId = new ObjectID();
    const event = {
      type: INTERVENTION,
      repetition: {
        frequency: NEVER,
        parentId,
      },
      startDate: '2019-01-21T09:38:18.653Z',
    };
    const result = await EventsRepetitionHelper.deleteRepetition(event, credentials);

    expect(result).toEqual(event);
    sinon.assert.notCalled(createEventHistoryOnDelete);
    sinon.assert.notCalled(deleteMany);
    sinon.assert.notCalled(deleteOne);
  });
});
