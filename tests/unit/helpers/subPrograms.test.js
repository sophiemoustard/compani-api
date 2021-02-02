const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const expect = require('expect');
const Program = require('../../../src/models/Program');
const SubProgram = require('../../../src/models/SubProgram');
const Step = require('../../../src/models/Step');
const Activity = require('../../../src/models/Activity');
const Course = require('../../../src/models/Course');
const SubProgramHelper = require('../../../src/helpers/subPrograms');
const SinonMongoose = require('../sinonMongoose');
require('sinon-mongoose');

describe('addSubProgram', () => {
  let updateOne;
  let create;

  beforeEach(() => {
    updateOne = sinon.stub(Program, 'updateOne');
    create = sinon.stub(SubProgram, 'create');
  });

  afterEach(() => {
    updateOne.restore();
    create.restore();
  });

  it('should create a subProgram', async () => {
    const program = { _id: new ObjectID() };
    const newSubProgram = { name: 'nouveau sous programme' };
    const subProgramId = new ObjectID();

    create.returns({ _id: subProgramId });

    await SubProgramHelper.addSubProgram(program._id, newSubProgram);

    sinon.assert.calledOnceWithExactly(create, newSubProgram);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: program._id }, { $push: { subPrograms: subProgramId } });
  });
});

describe('updatedSubProgram', () => {
  let updateOne;
  let findOneAndUpdate;
  let stepUpdateManyStub;
  let activityUpdateManyStub;
  let courseCreateStub;

  beforeEach(() => {
    updateOne = sinon.stub(SubProgram, 'updateOne');
    findOneAndUpdate = sinon.stub(SubProgram, 'findOneAndUpdate');
    stepUpdateManyStub = sinon.stub(Step, 'updateMany');
    activityUpdateManyStub = sinon.stub(Activity, 'updateMany');
    courseCreateStub = sinon.stub(Course, 'create');
  });

  afterEach(() => {
    updateOne.restore();
    findOneAndUpdate.restore();
    stepUpdateManyStub.restore();
    activityUpdateManyStub.restore();
    courseCreateStub.restore();
  });

  it('should update a subProgram name', async () => {
    const subProgram = { _id: new ObjectID(), name: 'non' };
    const payload = { name: 'si' };

    await SubProgramHelper.updateSubProgram(subProgram._id, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: subProgram._id }, { $set: payload });
    sinon.assert.notCalled(stepUpdateManyStub);
    sinon.assert.notCalled(activityUpdateManyStub);
    sinon.assert.notCalled(courseCreateStub);
  });

  describe('update status', () => {
    it('if subProgram is blended, should only update status', async () => {
      const payload = { status: 'published' };
      const subProgram = {
        _id: new ObjectID(),
        name: 'non',
        status: 'draft',
        steps: [new ObjectID(), new ObjectID()],
        isStrictlyELearning: false,
      };
      const activities = [new ObjectID()];
      const updatedSubProgram = {
        ...subProgram,
        status: 'published',
        steps: [
          { _id: subProgram.steps[0], activities, type: 'e_learning' },
          { _id: subProgram.steps[1], activities: [], type: 'on_site' },
        ],
      };

      findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([updatedSubProgram]));
      stepUpdateManyStub.returns({ activities });

      await SubProgramHelper.updateSubProgram(subProgram._id, payload);

      sinon.assert.calledWithExactly(
        stepUpdateManyStub,
        { _id: { $in: subProgram.steps } }, { status: payload.status }
      );
      sinon.assert.calledWithExactly(activityUpdateManyStub, { _id: { $in: activities } }, { status: payload.status });
      SinonMongoose.calledWithExactly(findOneAndUpdate, [
        { query: 'findOneAndUpdate', args: [{ _id: subProgram._id }, { $set: payload }] },
        { query: 'populate', args: [{ path: 'steps', select: 'activities type' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]);
      sinon.assert.notCalled(courseCreateStub);
    });

    it('if subProgram is strictly e-learning, should also create new course', async () => {
      const payload = { status: 'published' };
      const subProgram = {
        _id: new ObjectID(),
        name: 'non',
        status: 'draft',
        steps: [new ObjectID(), new ObjectID()],
        isStrictlyELearning: true,
      };
      const activities = [new ObjectID()];
      const updatedSubProgram = {
        ...subProgram,
        status: 'published',
        steps: [
          { _id: subProgram.steps[0], activities, type: 'e_learning' },
          { _id: subProgram.steps[1], activities: [], type: 'e_learning' },
        ],
      };
      findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([updatedSubProgram]));
      stepUpdateManyStub.returns({ activities });

      await SubProgramHelper.updateSubProgram(subProgram._id, payload);

      sinon.assert.calledWithExactly(
        stepUpdateManyStub,
        { _id: { $in: subProgram.steps } }, { status: payload.status }
      );
      sinon.assert.calledWithExactly(activityUpdateManyStub, { _id: { $in: activities } }, { status: payload.status });
      SinonMongoose.calledWithExactly(findOneAndUpdate, [
        { query: 'findOneAndUpdate', args: [{ _id: subProgram._id }, { $set: { status: payload.status } }] },
        { query: 'populate', args: [{ path: 'steps', select: 'activities type' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]);
      sinon.assert.calledWithExactly(
        courseCreateStub,
        { subProgram: subProgram._id, type: 'inter_b2c', format: 'strictly_e_learning', accessRules: [] }
      );
    });

    it('should create course with restricted access if subProgram is strictly e-learning and payload has accessCompany',
      async () => {
        const payload = { status: 'published', accessCompany: new ObjectID() };
        const subProgram = {
          _id: new ObjectID(),
          name: 'non',
          status: 'draft',
          steps: [new ObjectID(), new ObjectID()],
          isStrictlyELearning: true,
        };
        const activities = [new ObjectID()];
        const updatedSubProgram = {
          ...subProgram,
          status: 'published',
          steps: [
            { _id: subProgram.steps[0], activities, type: 'e_learning' },
            { _id: subProgram.steps[1], activities: [], type: 'e_learning' },
          ],
        };
        findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([updatedSubProgram]));
        stepUpdateManyStub.returns({ activities });

        await SubProgramHelper.updateSubProgram(subProgram._id, payload);

        sinon.assert.calledWithExactly(
          stepUpdateManyStub,
          { _id: { $in: subProgram.steps } }, { status: payload.status }
        );
        sinon.assert.calledWithExactly(
          activityUpdateManyStub,
          { _id: { $in: activities } }, { status: payload.status }
        );
        SinonMongoose.calledWithExactly(findOneAndUpdate, [
          { query: 'findOneAndUpdate', args: [{ _id: subProgram._id }, { $set: { status: payload.status } }] },
          { query: 'populate', args: [{ path: 'steps', select: 'activities type' }] },
          { query: 'lean', args: [{ virtuals: true }] },
        ]);
        sinon.assert.calledWithExactly(
          courseCreateStub,
          {
            subProgram: subProgram._id,
            type: 'inter_b2c',
            format: 'strictly_e_learning',
            accessRules: [payload.accessCompany],
          }
        );
      });
  });
});

describe('listELearningDraft', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(SubProgram, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return draft subprograms with elearning steps', async () => {
    const subProgramsList = [
      {
        _id: new ObjectID(),
        status: 'draft',
        steps: [{ type: 'e_learning' }],
        program: [{ _id: new ObjectID(), name: 'name' }],
      },
      {
        _id: new ObjectID(),
        status: 'draft',
        steps: [{ type: 'on_site' }],
        program: [{ _id: new ObjectID(), name: 'test' }],
      },
    ];
    const elearningSubProgramList = subProgramsList
      .filter(subProgram => subProgram.steps.length && subProgram.isStrictlyELearning);

    find.returns(SinonMongoose.stubChainedQueries([subProgramsList]));

    const result = await SubProgramHelper.listELearningDraft();

    expect(result).toMatchObject(elearningSubProgramList);
    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [{ status: 'draft' }] },
      { query: 'populate', args: [{ path: 'program', select: '_id name description image' }] },
      { query: 'populate', args: [{ path: 'steps', select: 'type' }] },
      { query: 'lean', args: [{ virtuals: true }] },
    ]);
  });
});

describe('getSubProgram', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(SubProgram, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return the requested subprogram', async () => {
    const subProgram = {
      _id: new ObjectID(),
      program: [{
        name: 'program',
        image: 'link',
        steps: [{ _id: new ObjectID(), activities: [{ _id: new ObjectID() }] }],
      }],
    };

    findOne.returns(SinonMongoose.stubChainedQueries([subProgram]));

    const result = await SubProgramHelper.getSubProgram(subProgram._id);

    expect(result).toMatchObject(subProgram);
    SinonMongoose.calledWithExactly(findOne, [
      { query: 'findOne', args: [{ _id: subProgram._id }] },
      { query: 'populate', args: [{ path: 'program', select: 'name image' }] },
      { query: 'populate', args: [{ path: 'steps', populate: { path: 'activities' } }] },
      { query: 'lean', args: [{ virtuals: true }] },
    ]);
  });
});
