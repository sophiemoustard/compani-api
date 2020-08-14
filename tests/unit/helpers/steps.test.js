const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const SubProgram = require('../../../src/models/SubProgram');
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
  let SubProgramMock;
  let StepMock;

  beforeEach(() => {
    SubProgramMock = sinon.mock(SubProgram);
    StepMock = sinon.mock(Step);
  });

  afterEach(() => {
    SubProgramMock.restore();
    StepMock.restore();
  });

  const subProgram = { _id: new ObjectID() };
  const newStep = { name: 'c\'est une étape !', type: 'lesson' };
  it('should create a step', async () => {
    const stepId = new ObjectID();
    SubProgramMock.expects('countDocuments').withExactArgs({ _id: subProgram._id }).returns(1);

    StepMock.expects('create').withExactArgs(newStep).returns({ _id: stepId });

    SubProgramMock.expects('updateOne').withExactArgs({ _id: subProgram._id }, { $push: { steps: stepId } });

    await StepHelper.addStep(subProgram._id, newStep);

    SubProgramMock.verify();
    StepMock.verify();
  });

  it('should return an error if program does not exist', async () => {
    try {
      SubProgramMock.expects('countDocuments').withExactArgs({ _id: subProgram._id }).returns(0);

      StepMock.expects('create').never();
      SubProgramMock.expects('updateOne').never();

      await StepHelper.addStep(subProgram._id, newStep);
    } catch (e) {
      SubProgramMock.verify();
      StepMock.verify();
    }
  });
});

