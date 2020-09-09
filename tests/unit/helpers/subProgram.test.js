const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const SubProgramHelper = require('../../../src/helpers/subPrograms');
require('sinon-mongoose');

describe('addSubProgram', () => {
  let ProgramMock;
  let SubProgramMock;

  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
    SubProgramMock = sinon.mock(SubProgram);
  });

  afterEach(() => {
    ProgramMock.restore();
    SubProgramMock.restore();
  });

  const program = { _id: new ObjectID() };
  const newSubProgram = { name: 'nouveau sous programme' };
  it('should create a subProgram', async () => {
    const subProgramId = new ObjectID();

    SubProgramMock.expects('create').withExactArgs(newSubProgram).returns({ _id: subProgramId });

    ProgramMock.expects('updateOne').withExactArgs({ _id: program._id }, { $push: { subPrograms: subProgramId } });

    await SubProgramHelper.addSubProgram(program._id, newSubProgram);

    ProgramMock.verify();
    SubProgramMock.verify();
  });
});

describe('updatedSubProgram', () => {
  let SubProgramMock;
  let stepUpdateManyStub;
  let activityUpdateManyStub;

  beforeEach(() => {
    SubProgramMock = sinon.mock(SubProgram);
    stepUpdateManyStub = sinon.stub(Step, 'updateMany');
    activityUpdateManyStub = sinon.stub(Activity, 'updateMany');
  });

  afterEach(() => {
    SubProgramMock.restore();
    stepUpdateManyStub.restore();
    activityUpdateManyStub.restore();
  });

  it('should update a subProgram name', async () => {
    const subProgram = { _id: new ObjectID(), name: 'non' };
    const payload = { name: 'si' };

    SubProgramMock.expects('updateOne')
      .withExactArgs({ _id: subProgram._id }, { $set: payload })
      .returns();

    await SubProgramHelper.updateSubProgram(subProgram._id, payload);

    SubProgramMock.verify();
    sinon.assert.notCalled(stepUpdateManyStub);
    sinon.assert.notCalled(activityUpdateManyStub);
  });

  it('should update a subProgram status', async () => {
    const subProgram = { _id: new ObjectID(), name: 'non', status: 'draft', steps: [new ObjectID()] };
    const payload = { status: 'published' };
    const activities = [new ObjectID()];
    const updatedSubProgram = { ...subProgram, ...payload, steps: [{ _id: subProgram.steps[0]._id, activities }] };
    SubProgramMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: subProgram._id }, { $set: payload })
      .chain('populate')
      .withExactArgs({ path: 'steps', select: 'activities' })
      .chain('lean')
      .returns(updatedSubProgram);

    stepUpdateManyStub.returns({ activities });

    await SubProgramHelper.updateSubProgram(subProgram._id, payload);

    sinon.assert.calledWithExactly(
      stepUpdateManyStub,
      { _id: subProgram.steps }, { status: payload.status }
    );
    sinon.assert.calledWithExactly(activityUpdateManyStub, { _id: activities }, { status: payload.status });
    SubProgramMock.verify();
  });
});
