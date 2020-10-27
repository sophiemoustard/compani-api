const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const CourseHistory = require('../../../src/models/CourseHistory');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');
const { SLOT_CREATION } = require('../../../src/helpers/constants');

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
