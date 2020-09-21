const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const set = require('lodash/set');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Course = require('../../../src/models/Course');
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
  let courseCreateStub;

  beforeEach(() => {
    SubProgramMock = sinon.mock(SubProgram);
    stepUpdateManyStub = sinon.stub(Step, 'updateMany');
    activityUpdateManyStub = sinon.stub(Activity, 'updateMany');
    courseCreateStub = sinon.stub(Course, 'create');
  });

  afterEach(() => {
    SubProgramMock.restore();
    stepUpdateManyStub.restore();
    activityUpdateManyStub.restore();
    courseCreateStub.restore();
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
    sinon.assert.notCalled(courseCreateStub);
  });

  describe('update status', () => {
    const payload = { status: 'published' };
    const subProgram = { _id: new ObjectID(), name: 'non', status: 'draft', steps: [new ObjectID(), new ObjectID()] };
    const activities = [new ObjectID()];
    const updatedSubProgram = {
      ...subProgram,
      status: 'published',
      steps: [
        { _id: subProgram.steps[0], activities, type: 'e_learning' },
        { _id: subProgram.steps[1], activities: [], type: 'on_site' },
      ],
    };

    it('if subProgram is blended, should only update status', async () => {
      SubProgramMock.expects('findOneAndUpdate')
        .withExactArgs({ _id: subProgram._id }, { $set: payload })
        .chain('populate')
        .withExactArgs({ path: 'steps', select: 'activities type' })
        .chain('lean')
        .returns(updatedSubProgram);

      stepUpdateManyStub.returns({ activities });

      await SubProgramHelper.updateSubProgram(subProgram._id, payload);

      sinon.assert.calledWithExactly(
        stepUpdateManyStub,
        { _id: { $in: subProgram.steps } }, { status: payload.status }
      );
      sinon.assert.calledWithExactly(activityUpdateManyStub, { _id: { $in: activities } }, { status: payload.status });
      SubProgramMock.verify();
      sinon.assert.notCalled(courseCreateStub);
    });

    it('if subProgram is strictly e-learning, should also create new course', async () => {
      set(updatedSubProgram, ['steps', '1', 'type'], 'e_learning');
      SubProgramMock.expects('findOneAndUpdate')
        .withExactArgs({ _id: subProgram._id }, { $set: payload })
        .chain('populate')
        .withExactArgs({ path: 'steps', select: 'activities type' })
        .chain('lean')
        .returns(updatedSubProgram);

      stepUpdateManyStub.returns({ activities });

      await SubProgramHelper.updateSubProgram(subProgram._id, payload);

      sinon.assert.calledWithExactly(
        stepUpdateManyStub,
        { _id: { $in: subProgram.steps } }, { status: payload.status }
      );
      sinon.assert.calledWithExactly(activityUpdateManyStub, { _id: { $in: activities } }, { status: payload.status });
      SubProgramMock.verify();
      sinon.assert.calledWithExactly(
        courseCreateStub,
        { subProgram: subProgram._id, type: 'inter_b2c', format: 'strictly_e_learning' }
      );
    });
  });
});
