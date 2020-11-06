const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const CourseHistory = require('../../../src/models/CourseHistory');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');
const { SLOT_CREATION, SLOT_DELETION, SLOT_EDITION, TRAINEE_ADDITION } = require('../../../src/helpers/constants');
require('sinon-mongoose');

describe('createHistoryOnSlotCreation', () => {
  let create;

  beforeEach(() => {
    create = sinon.stub(CourseHistory, 'create');
  });

  afterEach(() => {
    create.restore();
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
      courseId: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotCreation(payload, userId);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        slot: {
          startDate: payload.startDate,
          endDate: payload.endDate,
          address: payload.address,
        },
        course: payload.courseId,
        createdBy: userId,
        action: SLOT_CREATION,
      }
    );
  });
});

describe('createHistoryOnSlotDeletion', () => {
  let create;

  beforeEach(() => {
    create = sinon.stub(CourseHistory, 'create');
  });

  afterEach(() => {
    create.restore();
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
      courseId: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotDeletion(payload, userId);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        slot: { startDate: payload.startDate, endDate: payload.endDate, address: payload.address },
        course: payload.courseId,
        createdBy: userId,
        action: SLOT_DELETION,
      }
    );
  });
});

describe('createHistoryOnSlotEdition', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(CourseHistory, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create history if date is updated', async () => {
    const courseId = new ObjectID();
    const slotFromDb = { startDate: '2020-01-10T09:00:00', courseId };
    const payload = { startDate: '2020-01-11T09:00:00' };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotEdition(slotFromDb, payload, userId);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        createdBy: userId,
        action: SLOT_EDITION,
        course: courseId,
        update: { startDate: { from: '2020-01-10T09:00:00', to: '2020-01-11T09:00:00' } },
      }
    );
  });

  it('should not create history if date is not updated', async () => {
    const courseId = new ObjectID();
    const slotFromDb = { startDate: '2020-01-10T09:00:00', courseId };
    const payload = { startDate: '2020-01-10T09:00:00' };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotEdition(slotFromDb, payload, userId);

    sinon.assert.notCalled(create);
  });
});

describe('list', () => {
  let CourseHistoryMock;

  beforeEach(() => {
    CourseHistoryMock = sinon.mock(CourseHistory);
  });

  afterEach(() => {
    CourseHistoryMock.restore();
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

    CourseHistoryMock
      .expects('find')
      .withExactArgs(query)
      .chain('populate')
      .withExactArgs({ path: 'createdBy', select: '_id identity picture' })
      .chain('populate')
      .withExactArgs({ path: 'trainee', select: '_id identity' })
      .chain('sort')
      .withExactArgs({ createdAt: -1 })
      .chain('lean')
      .returns(returnedList);

    const result = await CourseHistoriesHelper.list(query);

    expect(result).toMatchObject(returnedList);
    CourseHistoryMock.verify();
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

    CourseHistoryMock
      .expects('find')
      .withExactArgs({ course: query.course, createdAt: { $lt: query.createdAt } })
      .chain('populate')
      .withExactArgs({ path: 'createdBy', select: '_id identity picture' })
      .chain('populate')
      .withExactArgs({ path: 'trainee', select: '_id identity' })
      .chain('sort')
      .withExactArgs({ createdAt: -1 })
      .chain('lean')
      .returns(returnedList);

    const result = await CourseHistoriesHelper.list(query);

    expect(result).toMatchObject(returnedList);
    CourseHistoryMock.verify();
  });
});

describe('createHistoryOnSlotDeletion', () => {
  let create;

  beforeEach(() => {
    create = sinon.stub(CourseHistory, 'create');
  });

  afterEach(() => {
    create.restore();
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
      courseId: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnSlotDeletion(payload, userId);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        slot: { startDate: payload.startDate, endDate: payload.endDate, address: payload.address },
        course: payload.courseId,
        createdBy: userId,
        action: SLOT_DELETION,
      }
    );
  });
});

describe('createHistoryOnTraineeAddition', () => {
  let create;

  beforeEach(() => {
    create = sinon.stub(CourseHistory, 'create');
  });

  afterEach(() => {
    create.restore();
  });

  it('should create a courseHistory', async () => {
    const payload = {
      traineeId: new ObjectID(),
      courseId: new ObjectID(),
    };
    const userId = new ObjectID();

    await CourseHistoriesHelper.createHistoryOnTraineeAddition(payload, userId);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        course: payload.courseId,
        createdBy: userId,
        action: TRAINEE_ADDITION,
        trainee: payload.traineeId,
      }
    );
  });
});
