const sinon = require('sinon');
const expect = require('expect');
const pick = require('lodash/pick');
const { ObjectId } = require('mongodb');
const moment = require('../../../src/extensions/moment');
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
  let hasConflicts;
  let createHistoryOnSlotCreation;
  beforeEach(() => {
    save = sinon.stub(CourseSlot.prototype, 'save').returnsThis();
    hasConflicts = sinon.stub(CourseSlotsHelper, 'hasConflicts');
    createHistoryOnSlotCreation = sinon.stub(CourseHistoriesHelper, 'createHistoryOnSlotCreation');
  });
  afterEach(() => {
    save.restore();
    hasConflicts.restore();
    createHistoryOnSlotCreation.restore();
  });

  it('should create a course slot', async () => {
    const newSlot = {
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: { fullAddress: 'ertyui', street: '12345', zipCode: '12345', city: 'qwert' },
      course: new ObjectId(),
      step: new ObjectId(),
    };
    const user = { _id: new ObjectId() };
    hasConflicts.returns(false);

    const result = await CourseSlotsHelper.createCourseSlot(newSlot, user);
    sinon.assert.calledOnceWithExactly(hasConflicts, newSlot);
    sinon.assert.calledOnceWithExactly(createHistoryOnSlotCreation, newSlot, user._id);
    expect(result.course).toEqual(newSlot.course);
    expect(moment(result.startDate).toISOString()).toEqual(moment(newSlot.startDate).toISOString());
    expect(moment(result.endDate).toISOString()).toEqual(moment(newSlot.endDate).toISOString());
  });

  it('should throw an error if conflicts', async () => {
    const newSlot = {
      startDate: '2019-02-03T09:00:00.000Z',
      endDate: '2019-02-03T10:00:00.000Z',
      address: { fullAddress: 'ertyui', street: '12345', zipCode: '12345', city: 'qwert' },
      course: new ObjectId(),
      step: new ObjectId(),
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
    const slot = { _id: new ObjectId() };
    const user = { _id: new ObjectId() };
    const payload = { startDate: '2020-03-03T22:00:00', step: new ObjectId(), meetingLink: 'https://github.com' };
    hasConflicts.returns(false);
    findByIdStep.returns(SinonMongoose.stubChainedQueries({ _id: payload.step, type: REMOTE }, ['lean']));

    await CourseSlotsHelper.updateCourseSlot(slot, payload, user);
    SinonMongoose.calledOnceWithExactly(findByIdStep, [{ query: 'findById', args: [payload.step] }, { query: 'lean' }]);
    sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
    sinon.assert.calledOnceWithExactly(createHistoryOnSlotEdition, slot, payload, user._id);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: slot._id },
      { $set: payload, $unset: { address: '' } }
    );
  });

  it('should update a remote course slot without meetingLink', async () => {
    const slot = { _id: new ObjectId() };
    const user = { _id: new ObjectId() };
    const payload = { startDate: '2020-03-03T22:00:00', step: new ObjectId() };
    hasConflicts.returns(false);
    findByIdStep.returns(SinonMongoose.stubChainedQueries({ _id: payload.step, type: REMOTE }, ['lean']));

    await CourseSlotsHelper.updateCourseSlot(slot, payload, user);
    SinonMongoose.calledOnceWithExactly(findByIdStep, [{ query: 'findById', args: [payload.step] }, { query: 'lean' }]);
    sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
    sinon.assert.calledOnceWithExactly(createHistoryOnSlotEdition, slot, payload, user._id);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: slot._id },
      { $set: payload, $unset: { meetingLink: '', address: '' } }
    );
  });

  it('should update an on site course slot with address', async () => {
    const slot = { _id: new ObjectId() };
    const user = { _id: new ObjectId() };
    const payload = {
      startDate: '2020-03-03T22:00:00',
      step: new ObjectId(),
      address: { fullAddress: '24 avenue Daumesnil' },
    };
    hasConflicts.returns(false);
    findByIdStep.returns(SinonMongoose.stubChainedQueries({ _id: payload.step, type: ON_SITE }, ['lean']));

    await CourseSlotsHelper.updateCourseSlot(slot, payload, user);
    SinonMongoose.calledOnceWithExactly(findByIdStep, [{ query: 'findById', args: [payload.step] }, { query: 'lean' }]);
    sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
    sinon.assert.calledOnceWithExactly(createHistoryOnSlotEdition, slot, payload, user._id);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: slot._id },
      { $set: payload, $unset: { meetingLink: '' } }
    );
  });

  it('should update an on site course slot without address', async () => {
    const slot = { _id: new ObjectId() };
    const user = { _id: new ObjectId() };
    const payload = { startDate: '2020-03-03T22:00:00', step: new ObjectId() };
    hasConflicts.returns(false);
    findByIdStep.returns(SinonMongoose.stubChainedQueries({ _id: payload.step, type: ON_SITE }, ['lean']));

    await CourseSlotsHelper.updateCourseSlot(slot, payload, user);
    SinonMongoose.calledOnceWithExactly(findByIdStep, [{ query: 'findById', args: [payload.step] }, { query: 'lean' }]);
    sinon.assert.calledOnceWithExactly(hasConflicts, { ...slot, ...payload });
    sinon.assert.calledOnceWithExactly(createHistoryOnSlotEdition, slot, payload, user._id);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: slot._id },
      { $set: payload, $unset: { meetingLink: '', address: '' } }
    );
  });

  it('should throw an error if conflicts', async () => {
    const slot = { _id: new ObjectId() };
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

describe('removeSlot', () => {
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

  it('should update a course slot', async () => {
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
});
