const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const CourseHistory = require('../../../src/models/CourseHistory');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');
const {
  SLOT_CREATION,
  SLOT_DELETION,
  SLOT_EDITION,
  TRAINEE_ADDITION,
  TRAINEE_DELETION,
} = require('../../../src/helpers/constants');
require('sinon-mongoose');
const SinonMongoose = require('../sinonMongoose');

describe('createHistory', () => {
  let create;

  beforeEach(() => {
    create = sinon.stub(CourseHistory, 'create');
  });

  afterEach(() => {
    create.restore();
  });

  it('should create history', async () => {
    const course = new ObjectID();
    const user = new ObjectID();
    await CourseHistoriesHelper.createHistory(course, user, 'action', { trainee: 'bonjour' });

    sinon.assert.calledOnceWithExactly(create, { course, createdBy: user, action: 'action', trainee: 'bonjour' });
  });
});

describe('createHistoryOnSlotCreation', () => {
  let createHistory;

  beforeEach(() => {
    createHistory = sinon.stub(CourseHistoriesHelper, 'createHistory');
  });

  afterEach(() => {
    createHistory.restore();
  });

  it('should create a courseHistory with address', async () => {
    const payload = {
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: {
        fullAddress: 'ertyui',
        street: '12345',
        zipCode: '12345',
        city: 'qwert',
        location: { type: 'Point', coordinates: [0, 1] },
      },
      course: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotCreation(payload, userId);

    sinon.assert.calledOnceWithExactly(
      createHistory,
      payload.course,
      userId,
      SLOT_CREATION,
      { slot: { startDate: payload.startDate, endDate: payload.endDate, address: payload.address } }
    );
  });

  it('should create a courseHistory without address', async () => {
    const payload = {
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      course: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotCreation(payload, userId);

    sinon.assert.calledOnceWithExactly(
      createHistory,
      payload.course,
      userId,
      SLOT_CREATION,
      { slot: { startDate: payload.startDate, endDate: payload.endDate } }
    );
  });
});

describe('createHistoryOnSlotDeletion', () => {
  let createHistory;

  beforeEach(() => {
    createHistory = sinon.stub(CourseHistoriesHelper, 'createHistory');
  });

  afterEach(() => {
    createHistory.restore();
  });

  it('should create a courseHistory', async () => {
    const payload = {
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: {
        fullAddress: 'ertyui',
        street: '12345',
        zipCode: '12345',
        city: 'qwert',
        location: { type: 'Point', coordinates: [0, 1] },
      },
      course: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotDeletion(payload, userId);

    sinon.assert.calledOnceWithExactly(
      createHistory,
      payload.course,
      userId,
      SLOT_DELETION,
      { slot: { startDate: payload.startDate, endDate: payload.endDate, address: payload.address } }
    );
  });
});

describe('createHistoryOnSlotEdition', () => {
  let createHistory;
  let createHistoryOnSlotCreation;
  beforeEach(() => {
    createHistory = sinon.stub(CourseHistoriesHelper, 'createHistory');
    createHistoryOnSlotCreation = sinon.stub(CourseHistoriesHelper, 'createHistoryOnSlotCreation');
  });

  afterEach(() => {
    createHistory.restore();
    createHistoryOnSlotCreation.restore();
  });

  it('should create history if date is updated', async () => {
    const course = new ObjectID();
    const slotFromDb = { startDate: '2020-01-10T09:00:00', course };
    const payload = { startDate: '2020-01-11T09:00:00' };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotEdition(slotFromDb, payload, userId);

    sinon.assert.calledOnceWithExactly(
      createHistory,
      course,
      userId,
      SLOT_EDITION,
      { update: { startDate: { from: '2020-01-10T09:00:00', to: '2020-01-11T09:00:00' } } }
    );
    sinon.assert.notCalled(createHistoryOnSlotCreation);
  });

  it('should create history with slot_creation action if not date in db', async () => {
    const course = new ObjectID();
    const slotFromDb = { course };
    const payload = { startDate: '2020-01-11T09:00:00' };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotEdition(slotFromDb, payload, userId);

    sinon.assert.calledOnceWithExactly(createHistoryOnSlotCreation, { ...slotFromDb, ...payload }, userId);
    sinon.assert.notCalled(createHistory);
  });

  it('should not create history if date is not updated', async () => {
    const course = new ObjectID();
    const slotFromDb = { startDate: '2020-01-10T09:00:00', course };
    const payload = { startDate: '2020-01-10T09:00:00' };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotEdition(slotFromDb, payload, userId);

    sinon.assert.notCalled(createHistory);
    sinon.assert.notCalled(createHistoryOnSlotCreation);
  });

  it('should create history if hour is updated', async () => {
    const course = new ObjectID();
    const slotFromDb = { startDate: '2020-01-10T09:00:00', endDate: '2020-01-10T11:30:00', course };
    const payload = { startDate: '2020-01-10T11:00:00', endDate: '2020-01-10T13:00:00' };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotEdition(slotFromDb, payload, userId);

    sinon.assert.calledOnceWithExactly(
      createHistory,
      course,
      userId,
      SLOT_EDITION,
      {
        update: {
          startHour: { from: '2020-01-10T09:00:00', to: '2020-01-10T11:00:00' },
          endHour: { from: '2020-01-10T11:30:00', to: '2020-01-10T13:00:00' },
        },
      }
    );
    sinon.assert.notCalled(createHistoryOnSlotCreation);
  });
});

describe('createHistoryOnSlotDeletion', () => {
  let createHistory;

  beforeEach(() => {
    createHistory = sinon.stub(CourseHistoriesHelper, 'createHistory');
  });

  afterEach(() => {
    createHistory.restore();
  });

  it('should create a courseHistory', async () => {
    const payload = {
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: { fullAddress: 'ertyui',
        street: '12345',
        zipCode: '12345',
        city: 'qwert',
        location: { type: 'Point', coordinates: [0, 1] } },
      course: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotDeletion(payload, userId);

    sinon.assert.calledOnceWithExactly(
      createHistory,
      payload.course,
      userId,
      SLOT_DELETION,
      { slot: { startDate: payload.startDate, endDate: payload.endDate, address: payload.address } }
    );
  });
});

describe('createHistoryOnTraineeAddition', () => {
  let createHistory;

  beforeEach(() => {
    createHistory = sinon.stub(CourseHistoriesHelper, 'createHistory');
  });

  afterEach(() => {
    createHistory.restore();
  });

  it('should create a courseHistory', async () => {
    const payload = {
      traineeId: new ObjectID(),
      course: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnTraineeAddition(payload, userId);

    sinon.assert.calledOnceWithExactly(
      createHistory,
      payload.course,
      userId,
      TRAINEE_ADDITION,
      { trainee: payload.traineeId }
    );
  });
});

describe('createHistoryOnTraineeDeletion', () => {
  let createHistory;

  beforeEach(() => {
    createHistory = sinon.stub(CourseHistoriesHelper, 'createHistory');
  });

  afterEach(() => {
    createHistory.restore();
  });

  it('should create a courseHistory', async () => {
    const payload = {
      traineeId: new ObjectID(),
      course: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnTraineeDeletion(payload, userId);

    sinon.assert.calledOnceWithExactly(
      createHistory,
      payload.course,
      userId,
      TRAINEE_DELETION,
      { trainee: payload.traineeId }
    );
  });
});

describe('list', () => {
  let find;

  beforeEach(() => {
    find = sinon.stub(CourseHistory, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return the requested course histories', async () => {
    const returnedList = [{
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: {
        fullAddress: 'ertyui',
        street: '12345',
        zipCode: '12345',
        city: 'qwert',
        location: { type: 'Point', coordinates: [0, 1] },
      },
      course: new ObjectID(),
    }];
    const query = { course: returnedList[0].course };

    find.returns(SinonMongoose.stubChainedQueries([returnedList], ['populate', 'sort', 'limit', 'lean']));

    const result = await CourseHistoriesHelper.list(query);

    expect(result).toMatchObject(returnedList);
    SinonMongoose.calledWithExactly(find, [
      { query: '', args: [query] },
      { query: 'populate', args: [{ path: 'createdBy', select: '_id identity picture' }] },
      { query: 'populate', args: [{ path: 'trainee', select: '_id identity' }] },
      { query: 'sort', args: [{ createdAt: -1 }] },
      { query: 'limit', args: [20] },
      { query: 'lean' },
    ]);
  });

  it('should return the requested course histories before createdAt', async () => {
    const returnedList = [{
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: {
        fullAddress: 'ertyui',
        street: '12345',
        zipCode: '12345',
        city: 'qwert',
        location: { type: 'Point', coordinates: [0, 1] },
      },
      course: new ObjectID(),
      createdAt: '2019-02-03T10:00:00.000Z',
    }];
    const query = { course: returnedList[0].course, createdAt: '2019-02-04T10:00:00.000Z' };

    find.returns(SinonMongoose.stubChainedQueries([returnedList], ['populate', 'sort', 'limit', 'lean']));

    const result = await CourseHistoriesHelper.list(query);

    expect(result).toMatchObject(returnedList);
    SinonMongoose.calledWithExactly(
      find,
      [
        { query: '', args: [{ course: query.course, createdAt: { $lt: query.createdAt } }] },
        { query: 'populate', args: [{ path: 'createdBy', select: '_id identity picture' }] },
        { query: 'populate', args: [{ path: 'trainee', select: '_id identity' }] },
        { query: 'sort', args: [{ createdAt: -1 }] },
        { query: 'limit', args: [20] },
        { query: 'lean' },
      ]
    );
  });
});
