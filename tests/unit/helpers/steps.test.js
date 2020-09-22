const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const StepHelper = require('../../../src/helpers/steps');
require('sinon-mongoose');

describe('updateStep', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Step, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update a step\'s name', async () => {
    const step = { _id: new ObjectID(), name: 'jour' };
    const payload = { name: 'nuit' };

    await StepHelper.updateStep(step._id, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: step._id }, { $set: payload });
  });
});

describe('addStep', () => {
  let updateOneSupProgram;
  let createStep;

  beforeEach(() => {
    updateOneSupProgram = sinon.stub(SubProgram, 'updateOne');
    createStep = sinon.stub(Step, 'create');
  });

  afterEach(() => {
    updateOneSupProgram.restore();
    createStep.restore();
  });

  it('should create a step', async () => {
    const subProgram = { _id: new ObjectID() };
    const newStep = { name: 'c\'est une étape !', type: 'lesson' };
    const stepId = new ObjectID();
    createStep.returns({ _id: stepId });

    await StepHelper.addStep(subProgram._id, newStep);

    sinon.assert.calledOnceWithExactly(updateOneSupProgram, { _id: subProgram._id }, { $push: { steps: stepId } });
    sinon.assert.calledOnceWithExactly(createStep, newStep);
  });
});

describe('reuseActivity', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Step, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should push a reused activity', async () => {
    const step = { _id: new ObjectID() };
    const payload = { activities: new ObjectID() };

    await StepHelper.reuseActivity(step._id, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: step._id }, { $push: payload });
  });
});

describe('detachStep', () => {
  let SubProgramUpdate;

  beforeEach(() => {
    SubProgramUpdate = sinon.stub(SubProgram, 'updateOne');
  });

  afterEach(() => {
    SubProgramUpdate.restore();
  });

  it('remove stepId of subProgram', async () => {
    const stepId = new ObjectID();
    const subProgramId = new ObjectID();

    await StepHelper.detachStep(subProgramId, stepId);

    sinon.assert.calledWithExactly(SubProgramUpdate, { _id: subProgramId }, { $pull: { steps: stepId } });
  });
});
