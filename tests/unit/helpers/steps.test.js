const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const Step = require('../../../src/models/Step');
const StepHelper = require('../../../src/helpers/steps');
require('sinon-mongoose');

describe('updateStep', () => {
  let StepMock;

  beforeEach(() => {
    StepMock = sinon.mock(Step);
  });

  afterEach(() => {
    StepMock.restore();
  });

  it('should update a step\'s name', async () => {
    const step = { _id: new ObjectID(), name: 'jour' };
    const payload = { name: 'nuit' };
    const updatedStep = { ...step, ...payload };

    StepMock.expects('updateOne')
      .withExactArgs({ _id: step._id }, { $set: payload })
      .returns(updatedStep);

    const result = await StepHelper.updateStep(step._id, payload);

    expect(result).toMatchObject(updatedStep);
    StepMock.verify();
  });
});

describe('addStep', () => {
  let ProgramMock;
  let StepMock;

  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
    StepMock = sinon.mock(Step);
  });

  afterEach(() => {
    ProgramMock.restore();
    StepMock.restore();
  });

  const program = { _id: new ObjectID() };
  const newStep = { name: 'c\'est une étape !', type: 'lesson' };
  it('should create a step', async () => {
    const stepId = new ObjectID();
    ProgramMock.expects('countDocuments').withExactArgs({ _id: program._id }).returns(1);

    StepMock.expects('create').withExactArgs(newStep).returns({ _id: stepId });

    ProgramMock.expects('updateOne').withExactArgs({ _id: program._id }, { $push: { steps: stepId } });

    await StepHelper.addStep(program._id, newStep);

    ProgramMock.verify();
    StepMock.verify();
  });

  it('should return an error if program does not exist', async () => {
    try {
      ProgramMock.expects('countDocuments').withExactArgs({ _id: program._id }).returns(0);

      StepMock.expects('create').never();
      ProgramMock.expects('updateOne').never();

      await StepHelper.addStep(program._id, newStep);
    } catch (e) {
      ProgramMock.verify();
      StepMock.verify();
    }
  });
});

