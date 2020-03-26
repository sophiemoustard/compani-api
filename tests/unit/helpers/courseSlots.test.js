const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('../../../src/extensions/moment');
const CourseSlot = require('../../../src/models/CourseSlot');
const CourseSlotsHelper = require('../../../src/helpers/courseSlots');
require('sinon-mongoose');

describe('createCourse', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(CourseSlot.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should create a course slot', async () => {
    const newSlot = {
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: { fullAddress: 'ertyui', street: '12345', zipCode: '12345', city: 'qwert' },
      courseId: new ObjectID(),
    };

    const result = await CourseSlotsHelper.createCourseSlot(newSlot);
    expect(result.courseId).toEqual(newSlot.courseId);
    expect(moment(result.startDate).toISOString()).toEqual(moment(newSlot.startDate).toISOString());
    expect(moment(result.endDate).toISOString()).toEqual(moment(newSlot.endDate).toISOString());
  });
});

describe('updateCourse', () => {
  let CourseSlotMock;
  beforeEach(() => {
    CourseSlotMock = sinon.mock(CourseSlot);
  });
  afterEach(() => {
    CourseSlotMock.restore();
  });

  it('should updte a course slot', async () => {
    const slotId = new ObjectID();
    const payload = { startDate: '2020-03-03T22:00:00' };
    CourseSlotMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: slotId }, { $set: payload })
      .chain('lean')
      .returns(payload);

    const result = await CourseSlotsHelper.updateCourseSlot(slotId, payload);
    expect(result.startDate).toEqual(payload.startDate);
  });
});

describe('removeSlot', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(CourseSlot, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should updte a course slot', async () => {
    const slotId = new ObjectID();

    await CourseSlotsHelper.removeCourseSlot(slotId);
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: slotId });
  });
});
