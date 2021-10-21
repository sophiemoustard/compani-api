const sinon = require('sinon');
const flat = require('flat');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const User = require('../../../src/models/User');
const Course = require('../../../src/models/Course');
const ProgramHelper = require('../../../src/helpers/programs');
const UserHelper = require('../../../src/helpers/users');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
const SinonMongoose = require('../sinonMongoose');

describe('createProgram', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(Program, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create program', async () => {
    const newProgram = { name: 'name', categories: [new ObjectID()] };
    await ProgramHelper.createProgram(newProgram);

    sinon.assert.calledOnceWithExactly(create, newProgram);
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Program, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return programs', async () => {
    const programsList = [{ name: 'name' }, { name: 'program' }];

    find.returns(SinonMongoose.stubChainedQueries([programsList]));

    const result = await ProgramHelper.list();
    expect(result).toMatchObject(programsList);
    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{}] },
        { query: 'populate', args: [{ path: 'subPrograms', select: 'name' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('listELearning', () => {
  let programFind;
  let courseFind;
  beforeEach(() => {
    programFind = sinon.stub(Program, 'find');
    courseFind = sinon.stub(Course, 'find');
  });
  afterEach(() => {
    programFind.restore();
    courseFind.restore();
  });

  it('should return programs with elearning subprograms', async () => {
    const programsList = [{ name: 'name' }, { name: 'program' }];
    const subPrograms = [new ObjectID()];
    const companyId = new ObjectID();
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };

    courseFind.returns(SinonMongoose.stubChainedQueries([[{ subProgram: subPrograms[0] }]], ['lean']));
    programFind.returns(SinonMongoose.stubChainedQueries([programsList]));

    const result = await ProgramHelper.listELearning(credentials);
    expect(result).toMatchObject([{ name: 'name' }, { name: 'program' }]);

    SinonMongoose.calledWithExactly(
      courseFind,
      [
        {
          query: 'find',
          args: [{ format: 'strictly_e_learning', $or: [{ accessRules: [] }, { accessRules: companyId }] }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      programFind,
      [
        { query: 'find', args: [{ subPrograms: { $in: subPrograms } }] },
        {
          query: 'populate',
          args: [{
            path: 'subPrograms',
            select: 'name',
            match: { _id: { $in: subPrograms } },
            populate: [
              { path: 'courses', select: '_id trainees', match: { format: 'strictly_e_learning' } },
              {
                path: 'steps',
                select: 'activities',
                populate: {
                  path: 'activities',
                  select: 'activityHistories',
                  populate: { path: 'activityHistories', match: { user: credentials._id } },
                },
              },
            ],
          }],
        },
        { query: 'populate', args: ['categories'] },
        { query: 'lean' },
      ]
    );
  });
});

describe('getProgram', () => {
  let programFindOne;
  beforeEach(() => {
    programFindOne = sinon.stub(Program, 'findOne');
  });
  afterEach(() => {
    programFindOne.restore();
  });

  it('should return the requested program', async () => {
    const programId = new ObjectID();
    const subProgramId = new ObjectID();
    const stepId = new ObjectID();
    const activityId = new ObjectID();
    const cardsIds = [new ObjectID(), new ObjectID()];

    const program = {
      _id: programId,
      subPrograms: [{
        _id: subProgramId,
        steps: [{
          _id: stepId,
          activities: [{
            _id: activityId,
            cards: [{ _id: cardsIds[0], text: 'oui' }, { _id: cardsIds[1], text: 'non' }],
          }],
        }],
      }],
    };

    programFindOne.returns(SinonMongoose.stubChainedQueries([program]));

    const result = await ProgramHelper.getProgram(program._id);

    expect(result).toMatchObject({
      _id: programId,
      subPrograms: [{
        _id: subProgramId,
        steps: [{
          _id: stepId,
          activities: [{
            _id: activityId,
            cards: cardsIds,
          }],
        }],
      }],
    });
    SinonMongoose.calledWithExactly(
      programFindOne,
      [
        { query: 'findOne', args: [{ _id: program._id }] },
        {
          query: 'populate',
          args: [{
            path: 'subPrograms',
            populate: {
              path: 'steps',
              populate: [{ path: 'activities ', populate: 'cards' }, { path: 'courseSlotsCount' }],
            },
          }],
        },
        {
          query: 'populate',
          args: [{ path: 'testers', select: 'identity.firstname identity.lastname local.email contact.phone' }],
        },
        { query: 'populate', args: ['categories'] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });
});

describe('getProgramSteps', () => {
  let programFindOne;
  beforeEach(() => {
    programFindOne = sinon.stub(Program, 'findOne');
  });
  afterEach(() => {
    programFindOne.restore();
  });

  it('should return steps without duplicates', async () => {
    const programId = new ObjectID();
    const stepId = new ObjectID();

    const program = {
      _id: programId,
      subPrograms: [
        { _id: new ObjectID(), steps: [{ _id: stepId, name: 'etape test', type: 'remote' }] },
        { _id: new ObjectID(), steps: [{ _id: stepId, name: 'etape test', type: 'remote' }] },
      ],
    };

    programFindOne.returns(SinonMongoose.stubChainedQueries([program], ['populate', 'lean']));

    const result = await ProgramHelper.getProgramSteps(programId);

    expect(result).toEqual([{ _id: stepId, name: 'etape test', type: 'remote' }]);
    SinonMongoose.calledWithExactly(
      programFindOne,
      [
        { query: 'findOne', args: [{ _id: program._id }] },
        {
          query: 'populate',
          args: [{
            path: 'subPrograms',
            populate: [{
              path: 'steps',
              select: 'name type',
            }],
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('update', () => {
  let programUpdateOne;
  beforeEach(() => {
    programUpdateOne = sinon.stub(Program, 'updateOne');
  });
  afterEach(() => {
    programUpdateOne.restore();
  });

  it('should update name', async () => {
    const programId = new ObjectID();
    const payload = { name: 'toto' };

    programUpdateOne.returns({ _id: programId, name: 'toto' });

    await ProgramHelper.updateProgram(programId, payload);

    programUpdateOne.calledOnceWithExactly({ _id: programId }, { $set: payload });
  });
});

describe('uploadImage', () => {
  let updateOne;
  let uploadMedia;
  beforeEach(() => {
    updateOne = sinon.stub(Program, 'updateOne');
    uploadMedia = sinon.stub(GCloudStorageHelper, 'uploadProgramMedia');
  });
  afterEach(() => {
    updateOne.restore();
    uploadMedia.restore();
  });

  it('should upload image', async () => {
    uploadMedia.returns({
      publicId: 'jesuisunsupernomdefichier',
      link: 'https://storage.googleapis.com/BucketKFC/myMedia',
    });

    const programId = new ObjectID();
    const payload = { file: new ArrayBuffer(32), fileName: 'illustration' };

    await ProgramHelper.uploadImage(programId, payload);

    sinon.assert.calledOnceWithExactly(uploadMedia, { file: new ArrayBuffer(32), fileName: 'illustration' });
    sinon.assert.calledWithExactly(
      updateOne,
      { _id: programId },
      {
        $set: flat({
          image: { publicId: 'jesuisunsupernomdefichier', link: 'https://storage.googleapis.com/BucketKFC/myMedia' },
        }),
      }
    );
  });
});

describe('deleteImage', () => {
  let updateOne;
  let deleteMedia;
  beforeEach(() => {
    updateOne = sinon.stub(Program, 'updateOne');
    deleteMedia = sinon.stub(GCloudStorageHelper, 'deleteProgramMedia');
  });
  afterEach(() => {
    updateOne.restore();
    deleteMedia.restore();
  });

  it('should do nothing as publicId is not set', async () => {
    const programId = new ObjectID();
    await ProgramHelper.deleteImage(programId, '');

    sinon.assert.notCalled(updateOne);
    sinon.assert.notCalled(deleteMedia);
  });

  it('should update card and delete media', async () => {
    const programId = new ObjectID();
    await ProgramHelper.deleteImage(programId, 'publicId');

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: programId },
      { $unset: { 'image.publicId': '', 'image.link': '' } }
    );
    sinon.assert.calledOnceWithExactly(deleteMedia, 'publicId');
  });
});

describe('addCategory', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Program, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should add category', async () => {
    const programId = new ObjectID();
    const payload = { categoryId: new ObjectID() };
    await ProgramHelper.addCategory(programId, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: programId }, { $push: { categories: payload.categoryId } });
  });
});

describe('removeCategory', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Program, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should remove category', async () => {
    const programId = new ObjectID();
    const categoryId = new ObjectID();
    await ProgramHelper.removeCategory(programId, categoryId);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: programId }, { $pull: { categories: categoryId } });
  });
});

describe('addTester', () => {
  let findOne;
  let findOneAndUpdate;
  let createUser;

  beforeEach(() => {
    findOne = sinon.stub(User, 'findOne');
    findOneAndUpdate = sinon.stub(Program, 'findOneAndUpdate');
    createUser = sinon.stub(UserHelper, 'createUser');
  });

  afterEach(() => {
    findOne.restore();
    findOneAndUpdate.restore();
    createUser.restore();
  });

  it('should add existing user to program as tester', async () => {
    const programId = new ObjectID();
    const user = { _id: new ObjectID(), local: { email: 'test@test.fr' } };
    findOne.returns(SinonMongoose.stubChainedQueries([user], ['lean']));
    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([{ _id: programId }], ['lean']));

    await ProgramHelper.addTester(programId, user);

    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ 'local.email': 'test@test.fr' }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      findOneAndUpdate,
      [
        { query: 'findOne', args: [{ _id: programId }, { $addToSet: { testers: user._id } }, { new: true }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(createUser);
  });

  it('should create a user and add it to program as tester', async () => {
    const programId = new ObjectID();
    const userId = new ObjectID();
    const payload = { local: { email: 'test@test.fr' } };

    findOne.returns(SinonMongoose.stubChainedQueries([], ['lean']));
    createUser.returns({ ...payload, _id: userId });
    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([{ _id: programId }], ['lean']));

    await ProgramHelper.addTester(programId, payload);

    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ 'local.email': 'test@test.fr' }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      findOneAndUpdate,
      [
        { query: 'findOne', args: [{ _id: programId }, { $addToSet: { testers: userId } }, { new: true }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(createUser, { ...payload, origin: 'webapp' });
  });
});

describe('removeTester', () => {
  let updateOne;

  beforeEach(() => {
    updateOne = sinon.stub(Program, 'updateOne');
  });

  afterEach(() => {
    updateOne.restore();
  });

  it('should remove tester', async () => {
    const programId = new ObjectID();
    const testerId = new ObjectID();
    updateOne.returns({ _id: programId });

    await ProgramHelper.removeTester(programId, testerId);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: programId }, { $pull: { testers: testerId } });
  });
});
