const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const set = require('lodash/set');
const expect = require('expect');
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

describe('listELearningDraft', () => {
  let SubProgramMock;
  beforeEach(() => {
    SubProgramMock = sinon.mock(SubProgram);
  });
  afterEach(() => {
    SubProgramMock.restore();
  });

  it('should return draft subprograms with elearning steps', async () => {
    const subProgramsList = [
      {
        _id: new ObjectID(),
        status: 'draft',
        steps: [{ type: 'e_learning' }],
        program: [
          { _id: new ObjectID(), name: 'name' },
        ],
      },
      {
        _id: new ObjectID(),
        status: 'draft',
        steps: [
          { type: 'on_site' },
        ],
        program: [
          { _id: new ObjectID(), name: 'test' },
        ],
      },
    ];

    SubProgramMock.expects('find')
      .withExactArgs({ status: 'draft' })
      .chain('populate')
      .withExactArgs({
        path: 'program',
        select: '_id name',
      })
      .chain('populate')
      .withExactArgs({
        path: 'steps',
        select: 'type',
      })
      .chain('lean')
      .once()
      .returns(subProgramsList);

    const elearningSubProgramList = subProgramsList
      .filter(subProgram => subProgram.steps
        .every(step => step.type === 'e_learning'));

    const result = await SubProgramHelper.listELearningDraft();
    expect(result).toMatchObject(elearningSubProgramList);
  });
});

describe('getSubProgram', () => {
  let SubProgramMock;
  beforeEach(() => {
    SubProgramMock = sinon.mock(SubProgram);
  });
  afterEach(() => {
    SubProgramMock.restore();
  });

  it('should return the requested subprogram', async () => {
    const subProgram = {
      _id: new ObjectID(),
      program: [{
        name: 'program',
        steps: [{
          _id: new ObjectID(),
          activities: [{ _id: new ObjectID() }],
        }],
      }],
    };

    SubProgramMock.expects('findOne')
      .withExactArgs({ _id: subProgram._id })
      .chain('populate')
      .withExactArgs({ path: 'program', select: 'name' })
      .chain('populate')
      .withExactArgs({
        path: 'steps', populate: { path: 'activities' },
      })
      .chain('lean')
      .once()
      .returns(subProgram);

    const result = await SubProgramHelper.getSubProgram(subProgram._id);
    expect(result).toMatchObject(subProgram);
  });
});
