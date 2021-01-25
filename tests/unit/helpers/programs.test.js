const sinon = require('sinon');
const flat = require('flat');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Program = require('../../../src/models/Program');
const Course = require('../../../src/models/Course');
const ProgramHelper = require('../../../src/helpers/programs');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
const SinonMongoose = require('../sinonMongoose');

require('sinon-mongoose');

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
  let ProgramMock;
  let CourseMock;
  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
    CourseMock = sinon.mock(Course);
  });
  afterEach(() => {
    ProgramMock.restore();
    CourseMock.restore();
  });

  it('should return programs with elearning subprograms', async () => {
    const programsList = [{ name: 'name' }, { name: 'program' }];
    const subPrograms = [new ObjectID()];
    const companyId = new ObjectID();
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };

    CourseMock.expects('find')
      .withExactArgs({ format: 'strictly_e_learning', $or: [{ accessRules: [] }, { accessRules: companyId }] })
      .chain('lean')
      .returns([{ subProgram: subPrograms[0] }]);

    ProgramMock.expects('find')
      .withExactArgs({ subPrograms: { $in: subPrograms } })
      .chain('populate')
      .withExactArgs({
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
      })
      .chain('populate')
      .withExactArgs('categories')
      .chain('lean')
      .once()
      .returns(programsList);

    const result = await ProgramHelper.listELearning(credentials);
    expect(result).toMatchObject(programsList);
  });
});

describe('getProgram', () => {
  let ProgramMock;
  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
  });
  afterEach(() => {
    ProgramMock.restore();
  });

  it('should return the requested program', async () => {
    const program = {
      _id: new ObjectID(),
      subPrograms: [{
        _id: new ObjectID(),
        steps: [{
          _id: new ObjectID(),
          activities: [{ _id: new ObjectID(), cards: [{ _id: new ObjectID() }] }],
        }],
      }],
    };

    ProgramMock.expects('findOne')
      .withExactArgs({ _id: program._id })
      .chain('populate')
      .withExactArgs({
        path: 'subPrograms',
        populate: { path: 'steps', populate: { path: 'activities', populate: 'cards' } },
      })
      .chain('populate')
      .withExactArgs({ path: 'categories' })
      .chain('lean')
      .once()
      .returns(program);

    const result = await ProgramHelper.getProgram(program._id);
    expect(result).toMatchObject(program);
  });
});

describe('update', () => {
  let ProgramMock;
  beforeEach(() => {
    ProgramMock = sinon.mock(Program);
  });
  afterEach(() => {
    ProgramMock.restore();
  });

  it('should update name', async () => {
    const programId = new ObjectID();
    const payload = { name: 'toto' };

    ProgramMock.expects('updateOne')
      .withExactArgs({ _id: programId }, { $set: payload })
      .returns({ _id: programId, name: 'toto' });

    const result = await ProgramHelper.updateProgram(programId, payload);
    expect(result).toMatchObject({ _id: programId, name: 'toto' });
  });

  it('should update image', async () => {
    const programId = new ObjectID();
    const payload = { image: { publicId: new ObjectID(), link: new ObjectID() } };

    ProgramMock.expects('updateOne')
      .withExactArgs({ _id: programId }, { $set: payload })
      .returns({ _id: programId, ...payload });

    const result = await ProgramHelper.updateProgram(programId, payload);
    expect(result).toMatchObject({ _id: programId, ...payload });
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
