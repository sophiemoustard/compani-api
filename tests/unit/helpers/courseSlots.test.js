const sinon = require('sinon');
const expect = require('expect');
const pick = require('lodash/pick');
const { ObjectId } = require('mongodb');
const CourseSlot = require('../../../src/models/CourseSlot');
const Step = require('../../../src/models/Step');
const CourseSlotsHelper = require('../../../src/helpers/courseSlots');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');
const SinonMongoose = require('../sinonMongoose');
const { REMOTE, ON_SITE } = require('../../../src/helpers/constants');

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
      _id: new ObjectId(),
      course: new ObjectId(),
      startDate: '2020-09-12T09:00:00',
      endDate: '2020-09-12T11:00:00',
      step: new ObjectId(),
    };
    countDocuments.returns(2);
    const result = await CourseSlotsHelper.hasConflicts(slot);

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(
      countDocuments,
      {
        _id: { $ne: slot._id },
        course: slot.course,
        startDate: { $lt: '2020-09-12T11:00:00' },
        endDate: { $gt: '2020-09-12T09:00:00' },
      }
    );
  });

  it('should return false if no conflict', async () => {
    const slot = {
      course: new ObjectId(),
      startDate: '2020-09-12T09:00:00',
      endDate: '2020-09-12T11:00:00',
      step: new ObjectId(),
    };
    countDocuments.returns(0);
    const result = await CourseSlotsHelper.hasConflicts(slot);

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(
      countDocuments,
      {
        course: slot.course,
        startDate: { $lt: '2020-09-12T11:00:00' },
        endDate: { $gt: '2020-09-12T09:00:00' },
      }
    );
  });
});

describe('createCourseSlot', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(CourseSlot.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should create a course slot', async () => {
    const newSlot = { course: new ObjectId(), step: new ObjectId() };

    const result = await CourseSlotsHelper.createCourseSlot(newSlot);
    expect(result.course).toEqual(newSlot.course);
  });
});

describe('updateCourseSlot', () => {
  let updateOne;
  let hasConflicts;
  let createHistoryOnSlotEdition;
  let findByIdStep;
  beforeEach(() => {
    updateOne = sinon.stub(CourseSlot, 'updateOne');
    hasConflicts = sinon.stub(CourseSlotsHelper, 'hasConflicts');
    createHistoryOnSlotEdition = sinon.stub(CourseHistoriesHelper, 'createHistoryOnSlotEdition');
    findByIdStep = sinon.stub(Step, 'findById');
  });
  afterEach(() => {
    updateOne.restore();
    hasConflicts.restore();
    createHistoryOnSlotEdition.restore();
    findByIdStep.restore();
  });

  it('should update a remote course slot with meetingLink', async () => {
    const slot = { _id: new ObjectId(), step: { _id: new ObjectId() } };
    const user = { _id: new ObjectId() };
    const payload = { startDate: '2020-03-03T22:00:00', meetingLink: 'https://github.com' };
    hasConflicts.returns(false);
    findByIdStep.returns(SinonMongoose.stubChainedQueries({ _id: payload.step, type: REMOTE }, ['lean']));

    await CourseSlotsHelper.updateCourseSlot(slot, payload, user);
    SinonMongoose.calledOnceWithExactly(
      findByIdStep,
      [{ query: 'findById', args: [slot.step._id] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
    sinon.assert.calledOnceWithExactly(createHistoryOnSlotEdition, slot, payload, user._id);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: slot._id },
      { $set: payload, $unset: { address: '' } }
    );
  });

  it('should update a remote course slot without meetingLink', async () => {
    const slot = { _id: new ObjectId(), step: { _id: new ObjectId() } };
    const user = { _id: new ObjectId() };
    const payload = { startDate: '2020-03-03T22:00:00' };
    hasConflicts.returns(false);
    findByIdStep.returns(SinonMongoose.stubChainedQueries({ _id: payload.step, type: REMOTE }, ['lean']));

    await CourseSlotsHelper.updateCourseSlot(slot, payload, user);
    SinonMongoose.calledOnceWithExactly(
      findByIdStep,
      [{ query: 'findById', args: [slot.step._id] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
    sinon.assert.calledOnceWithExactly(createHistoryOnSlotEdition, slot, payload, user._id);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: slot._id },
      { $set: payload, $unset: { meetingLink: '', address: '' } }
    );
  });

  it('should update an on site course slot with address', async () => {
    const slot = { _id: new ObjectId(), step: { _id: new ObjectId() } };
    const user = { _id: new ObjectId() };
    const payload = { startDate: '2020-03-03T22:00:00', address: { fullAddress: '24 avenue Daumesnil' } };
    hasConflicts.returns(false);
    findByIdStep.returns(SinonMongoose.stubChainedQueries({ _id: payload.step, type: ON_SITE }, ['lean']));

    await CourseSlotsHelper.updateCourseSlot(slot, payload, user);
    SinonMongoose.calledOnceWithExactly(
      findByIdStep,
      [{ query: 'findById', args: [slot.step._id] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
    sinon.assert.calledOnceWithExactly(createHistoryOnSlotEdition, slot, payload, user._id);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: slot._id },
      { $set: payload, $unset: { meetingLink: '' } }
    );
  });

  it('should update an on site course slot without address', async () => {
    const slot = { _id: new ObjectId(), step: { _id: new ObjectId() } };
    const user = { _id: new ObjectId() };
    const payload = { startDate: '2020-03-03T22:00:00' };
    hasConflicts.returns(false);
    findByIdStep.returns(SinonMongoose.stubChainedQueries({ _id: payload.step, type: ON_SITE }, ['lean']));

    await CourseSlotsHelper.updateCourseSlot(slot, payload, user);
    SinonMongoose.calledOnceWithExactly(
      findByIdStep,
      [{ query: 'findById', args: [slot.step._id] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
    sinon.assert.calledOnceWithExactly(createHistoryOnSlotEdition, slot, payload, user._id);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: slot._id },
      { $set: payload, $unset: { meetingLink: '', address: '' } }
    );
  });

  it('should throw an error if conflicts', async () => {
    const slot = { _id: new ObjectId(), step: { _id: new ObjectId() } };
    const payload = { startDate: '2020-03-03T22:00:00' };
    const user = { _id: new ObjectId() };
    hasConflicts.returns(true);

    try {
      await CourseSlotsHelper.updateCourseSlot(slot, payload, user);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
      sinon.assert.notCalled(findByIdStep);
      sinon.assert.notCalled(updateOne);
      sinon.assert.notCalled(createHistoryOnSlotEdition);
    }
  });
});

describe('removeCourseSlot', () => {
  let deleteOne;
  let createHistoryOnSlotDeletion;
  beforeEach(() => {
    deleteOne = sinon.stub(CourseSlot, 'deleteOne');
    createHistoryOnSlotDeletion = sinon.stub(CourseHistoriesHelper, 'createHistoryOnSlotDeletion');
  });
  afterEach(() => {
    deleteOne.restore();
    createHistoryOnSlotDeletion.restore();
  });

  it('should remove a course slot with dates', async () => {
    const user = { _id: new ObjectId() };
    const returnedCourseSlot = {
      _id: new ObjectId(),
      course: new ObjectId(),
      startDate: '2020-06-25T17:58:15',
      endDate: '2019-06-25T19:58:15',
      address: { fullAddress: '55 rue du sku, Skuville' },
    };

    await CourseSlotsHelper.removeCourseSlot(returnedCourseSlot, user);

    const payload = pick(returnedCourseSlot, ['course', 'startDate', 'endDate', 'address']);

    sinon.assert.calledOnceWithExactly(createHistoryOnSlotDeletion, payload, user._id);
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: returnedCourseSlot._id });
  });

  it('should remove a course slot without dates', async () => {
    const user = { _id: new ObjectId() };
    const returnedCourseSlot = {
      _id: new ObjectId(),
      course: new ObjectId(),
      address: { fullAddress: '55 rue du sku, Skuville' },
    };

    await CourseSlotsHelper.removeCourseSlot(returnedCourseSlot, user);

    sinon.assert.notCalled(createHistoryOnSlotDeletion);
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: returnedCourseSlot._id });
  });
});
