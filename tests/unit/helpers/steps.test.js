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

  it("should update a step's title", async () => {
    const step = { _id: new ObjectID(), title: 'jour' };
    const payload = { title: 'nuit' };
    const updatedStep = { ...step, ...payload };

    StepMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: step._id }, { $set: payload }, { new: true })
      .chain('lean')
      .once()
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
  const newStep = { title: 'c\'est une étape !' };
  it('should create a step', async () => {
    const stepId = new ObjectID();
    ProgramMock.expects('countDocuments').withExactArgs({ _id: program._id }).returns(1);

    StepMock.expects('create').withExactArgs(newStep).returns({ _id: stepId });

    const returnedProgram = { ...program, steps: [stepId] };
    ProgramMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: program._id }, { $push: { steps: stepId } }, { new: true })
      .chain('lean')
      .returns(returnedProgram);

    const result = await StepHelper.addStep(program._id, newStep);

    expect(result).toMatchObject(returnedProgram);
    ProgramMock.verify();
    StepMock.verify();
  });

  it('should return an error if program does not exist', async () => {
    try {
      ProgramMock.expects('countDocuments').withExactArgs({ _id: program._id }).returns(0);

      StepMock.expects('create').never();
      ProgramMock.expects('findOneAndUpdate').never();

      const result = await StepHelper.addStep(program._id, newStep);

      expect(result).toBeUndefined();
    } catch (e) {
      ProgramMock.verify();
      StepMock.verify();
    }
  });
});

