const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const momentRange = require('moment-range');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const Event = require('../../../src/models/Event');
const User = require('../../../src/models/User');
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
  INTERNAL_HOUR,
} = require('../../../src/helpers/constants');

require('sinon-mongoose');

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
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00.000Z', endDate: '2019-01-10T11:00:00' };
    formatRepeatedPayload.returns(new Event({ company: new ObjectID() }));
    await EventsRepetitionHelper.createRepetitionsEveryDay(event, sector);

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
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00', endDate: '2019-01-10T11:00:00' };
    formatRepeatedPayload.returns(new Event({ company: new ObjectID() }));
    await EventsRepetitionHelper.createRepetitionsEveryWeekDay(event, sector);

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

  it('should create repetition every week', async () => {
    const sector = new ObjectID();
    const event = { startDate: '2019-01-10T09:00:00', endDate: '2019-01-10T11:00:00' };
    formatRepeatedPayload.returns(new Event({ company: new ObjectID() }));
    await EventsRepetitionHelper.createRepetitionsByWeek(event, sector, 1);

    sinon.assert.callCount(formatRepeatedPayload, 12);
    sinon.assert.callCount(insertMany, 1);
  });
});

describe('createRepetitions', () => {
  let updateOne;
  let createRepetitionsEveryDay;
  let createRepetitionsEveryWeekDay;
  let createRepetitionsByWeek;
  let saveRepetition;
  let UserMock;
  beforeEach(() => {
    updateOne = sinon.stub(Event, 'updateOne');
    createRepetitionsEveryDay = sinon.stub(EventsRepetitionHelper, 'createRepetitionsEveryDay');
    createRepetitionsEveryWeekDay = sinon.stub(EventsRepetitionHelper, 'createRepetitionsEveryWeekDay');
    createRepetitionsByWeek = sinon.stub(EventsRepetitionHelper, 'createRepetitionsByWeek');
    saveRepetition = sinon.stub(Repetition.prototype, 'save');
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    updateOne.restore();
    createRepetitionsEveryDay.restore();
    createRepetitionsEveryWeekDay.restore();
    createRepetitionsByWeek.restore();
    saveRepetition.restore();
    UserMock.restore();
  });

  it('should call updateOne', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const payload = { _id: '1234567890', repetition: { frequency: 'every_day', parentId: '0987654321' } };
    const event = new Event({ repetition: { frequency: EVERY_WEEK }, company: new ObjectID(), auxiliary: auxiliaryId });
    UserMock.expects('findOne')
      .withExactArgs({ _id: auxiliaryId })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .once()
      .returns({ _id: auxiliaryId, sector: sectorId });
    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

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
    UserMock.expects('findOne')
      .withExactArgs({ _id: auxiliaryId })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .once()
      .returns({ _id: auxiliaryId, sector: sectorId });

    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

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
    UserMock.expects('findOne').never();

    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

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
    UserMock.expects('findOne').never();

    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

    sinon.assert.notCalled(updateOne);
    sinon.assert.calledWithExactly(createRepetitionsByWeek, payload, sectorId, 1);
    sinon.assert.called(saveRepetition);
  });

  it('should call createRepetitionsByWeek to repeat every two weeks', async () => {
    const sectorId = new ObjectID();
    const credentials = { company: { _id: new ObjectID() } };
    const payload = { _id: '1234567890', repetition: { frequency: 'every_two_weeks', parentId: '0987654321' } };
    const event = new Event({ company: new ObjectID(), sector: sectorId });
    UserMock.expects('findOne').never();

    await EventsRepetitionHelper.createRepetitions(event, payload, credentials);

    sinon.assert.notCalled(updateOne);
    sinon.assert.calledWithExactly(createRepetitionsByWeek, payload, sectorId, 2);
    sinon.assert.called(saveRepetition);
  });
});

describe('updateRepetition', () => {
  let hasConflicts;
  let EventMock;
  let findOneAndUpdateEvent;
  let updateRepetitions;
  let UserMock;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    EventMock = sinon.mock(Event);
    findOneAndUpdateEvent = sinon.stub(Event, 'updateOne');
    updateRepetitions = sinon.stub(RepetitionHelper, 'updateRepetitions');
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    hasConflicts.restore();
    EventMock.restore();
    findOneAndUpdateEvent.restore();
    updateRepetitions.restore();
    UserMock.restore();
  });

  it('should update repetition', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
    const event = {
      repetition: { parentId: 'qwertyuiop', frequency: 'every_day' },
      startDate: '2019-03-23T09:00:00.000Z',
      type: INTERVENTION,
      sector: new ObjectID(),
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
    UserMock.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns({ sector: sectorId, _id: auxiliaryId });
    EventMock.expects('find')
      .withExactArgs({
        'repetition.parentId': 'qwertyuiop',
        'repetition.frequency': { $not: { $eq: 'never' } },
        startDate: { $gte: new Date('2019-03-23T09:00:00.000Z') },
        company: credentials.company._id,
      })
      .chain('lean')
      .returns(events);
    hasConflicts.returns(false);
    await EventsRepetitionHelper.updateRepetition(event, payload, credentials);

    sinon.assert.calledThrice(hasConflicts);
    sinon.assert.calledThrice(findOneAndUpdateEvent);
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
    EventMock.expects('find')
      .chain('lean')
      .returns(events);
    hasConflicts.returns(true);
    UserMock.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns({ sector: sectorId, _id: auxiliaryId });
    const credentials = { company: { _id: new ObjectID() } };
    await EventsRepetitionHelper.updateRepetition(event, payload, credentials);

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
      findOneAndUpdateEvent,
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
  });
});

describe('deleteRepetition', () => {
  let createEventHistoryOnDelete;
  let deleteMany;
  let deleteOne;
  const credentials = { _id: (new ObjectID()).toHexString(), company: { _id: new ObjectID() } };
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
    sinon.assert.calledWithExactly(createEventHistoryOnDelete, event, credentials);
    sinon.assert.calledWithExactly(
      deleteMany,
      {
        'repetition.parentId': parentId,
        startDate: { $gte: new Date(event.startDate) },
        $or: [{ isBilled: false }, { isBilled: { $exists: false } }],
        company: credentials.company._id,
      }
    );
    sinon.assert.calledWithExactly(deleteOne, { parentId });
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

describe('formatEventBasedOnRepetition', () => {
  let hasConflicts;
  let UserMock;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    hasConflicts.restore();
    UserMock.restore();
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
    UserMock.expects('findOne').never();

    const event = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, new Date());

    expect(event.toObject()).toEqual(expect.objectContaining({
      ...omit(repetition, ['frequency', 'parentId', 'startDate', 'endDate']),
      repetition: { frequency: repetition.frequency, parentId: repetition.parentId },
      startDate: moment().add(90, 'd').set({ hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
      endDate: moment().add(90, 'd').set({ hours: 10, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
      isBilled: false,
      isCancelled: false,
      bills: { surcharges: [] },
    }));
    UserMock.verify();
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
    UserMock.expects('findOne').never();

    const event = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, new Date());

    expect(event).toBeNull();
    UserMock.verify();
  });

  it('should format and unassign event based on repetition', async () => {
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

    hasConflicts.returns(true);
    const sectorId = new ObjectID();
    UserMock.expects('findOne')
      .withExactArgs({ _id: repetition.auxiliary })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: repetition.company } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns({ _id: repetition.auxiliary, sector: sectorId });

    const event = await EventsRepetitionHelper.formatEventBasedOnRepetition(repetition, '2020-03-11T00:00:00');

    expect(event.toObject()).toEqual(expect.objectContaining({
      ...omit(repetition, ['frequency', 'parentId', 'auxiliary', 'startDate', 'endDate']),
      sector: sectorId,
      repetition: { frequency: 'never', parentId: repetition.parentId },
      startDate: moment('2020-03-11').add(90, 'd').set({ hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
      endDate: moment('2020-03-11').add(90, 'd').set({ hours: 10, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
      isBilled: false,
      isCancelled: false,
      bills: { surcharges: [] },
    }));
    UserMock.verify();
  });
});
