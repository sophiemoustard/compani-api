const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('../../../src/extensions/moment');
const CourseSlot = require('../../../src/models/CourseSlot');
const CourseSlotsHelper = require('../../../src/helpers/courseSlots');
require('sinon-mongoose');

describe('hasConflicts', () => {
  let countDocuments;
  beforeEach(() => {
    countDocuments = sinon.stub(CourseSlot, 'countDocuments');
  });
  afterEach(() => {
    countDocuments.restore();
  });

  it('should return true if has conflicts', async () => {
    const slot = {
      _id: new ObjectID(),
      courseId: new ObjectID(),
      startDate: '2020-09-12T09:00:00',
      endDate: '2020-09-12T11:00:00',
      step: new ObjectID(),
    };
    countDocuments.returns(2);
    const result = await CourseSlotsHelper.hasConflicts(slot);

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(
      countDocuments,
      {
        _id: { $ne: slot._id },
        courseId: slot.courseId,
        startDate: { $lt: '2020-09-12T11:00:00' },
        endDate: { $gt: '2020-09-12T09:00:00' },
      }
    );
  });

  it('should return false if no conflict', async () => {
    const slot = {
      courseId: new ObjectID(),
      startDate: '2020-09-12T09:00:00',
      endDate: '2020-09-12T11:00:00',
      step: new ObjectID(),
    };
    countDocuments.returns(0);
    const result = await CourseSlotsHelper.hasConflicts(slot);

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(
      countDocuments,
      {
        courseId: slot.courseId,
        startDate: { $lt: '2020-09-12T11:00:00' },
        endDate: { $gt: '2020-09-12T09:00:00' },
      }
    );
  });
});

describe('createCourseSlot', () => {
  let save;
  let hasConflicts;
  beforeEach(() => {
    save = sinon.stub(CourseSlot.prototype, 'save').returnsThis();
    hasConflicts = sinon.stub(CourseSlotsHelper, 'hasConflicts');
  });
  afterEach(() => {
    save.restore();
    hasConflicts.restore();
  });

  it('should create a course slot', async () => {
    const newSlot = {
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: { fullAddress: 'ertyui', street: '12345', zipCode: '12345', city: 'qwert' },
      courseId: new ObjectID(),
      step: new ObjectID(),
    };
    hasConflicts.returns(false);

    const result = await CourseSlotsHelper.createCourseSlot(newSlot);
    sinon.assert.calledOnceWithExactly(hasConflicts, newSlot);
    expect(result.courseId).toEqual(newSlot.courseId);
    expect(moment(result.startDate).toISOString()).toEqual(moment(newSlot.startDate).toISOString());
    expect(moment(result.endDate).toISOString()).toEqual(moment(newSlot.endDate).toISOString());
  });

  it('should throw an error if conflicts', async () => {
    const newSlot = {
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: { fullAddress: 'ertyui', street: '12345', zipCode: '12345', city: 'qwert' },
      courseId: new ObjectID(),
      step: new ObjectID(),
    };
    hasConflicts.returns(true);

    try {
      await CourseSlotsHelper.createCourseSlot(newSlot);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledOnceWithExactly(hasConflicts, newSlot);
    }
  });
});

describe('updateCourseSlot', () => {
  let updateOne;
  let hasConflicts;
  beforeEach(() => {
    updateOne = sinon.stub(CourseSlot, 'updateOne');
    hasConflicts = sinon.stub(CourseSlotsHelper, 'hasConflicts');
  });
  afterEach(() => {
    updateOne.restore();
    hasConflicts.restore();
  });

  it('should update a course slot', async () => {
    const slot = { _id: new ObjectID() };
    const payload = { startDate: '2020-03-03T22:00:00', step: new ObjectID() };
    hasConflicts.returns(false);

    await CourseSlotsHelper.updateCourseSlot(slot, payload);
    sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
    sinon.assert.calledOnceWithExactly(updateOne, { _id: slot._id }, { $set: payload });
  });

  it('should throw an error if conflicts', async () => {
    const slot = { _id: new ObjectID() };
    const payload = { startDate: '2020-03-03T22:00:00' };
    hasConflicts.returns(true);

    try {
      await CourseSlotsHelper.updateCourseSlot(slot, payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
      sinon.assert.notCalled(updateOne);
    }
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
