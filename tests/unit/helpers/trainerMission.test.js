const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const Course = require('../../../src/models/Course');
const TrainerMission = require('../../../src/models/TrainerMission');
const trainerMissionsHelper = require('../../../src/helpers/trainerMissions');
const SinonMongoose = require('../sinonMongoose');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
const { VENDOR_ADMIN } = require('../../../src/helpers/constants');

describe('upload', () => {
  let uploadCourseFile;
  let courseFindOne;
  let create;

  beforeEach(() => {
    uploadCourseFile = sinon.stub(GCloudStorageHelper, 'uploadCourseFile');
    create = sinon.stub(TrainerMission, 'create');
    courseFindOne = sinon.stub(Course, 'findOne');
  });

  afterEach(() => {
    uploadCourseFile.restore();
    create.restore();
    courseFindOne.restore();
  });

  it('should create a trainer mission for a single course', async () => {
    const credentials = { _id: new ObjectId() };
    const courseId = new ObjectId();
    const trainerId = new ObjectId();
    const course = {
      _id: courseId,
      trainer: { _id: trainerId, identity: { lastname: 'For', firstname: 'Matrice' } },
      subProgram: { program: { name: 'program' } },
    };
    const payload = { courses: courseId, file: 'test.pdf', fee: 1200, trainer: trainerId };

    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));

    await trainerMissionsHelper.upload(payload, credentials);

    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'ordre mission program Matrice FOR', file: 'test.pdf' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      {
        courses: [courseId],
        fee: 1200,
        trainer: trainerId,
        file: { publicId: 'yo', link: 'yo' },
        createdBy: credentials._id,
      }
    );
    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }, { trainer: 1, subProgram: 1 }] },
        {
          query: 'populate',
          args: [[
            { path: 'trainer', select: 'identity' },
            { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
          ]],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should create a trainer mission for several courses', async () => {
    const credentials = { _id: new ObjectId() };
    const courseIds = [new ObjectId(), new ObjectId()];
    const trainerId = new ObjectId();
    const course = {
      _id: courseIds[0],
      trainer: { _id: trainerId, identity: { lastname: 'For', firstname: 'Matrice' } },
      subProgram: { program: { name: 'program' } },
    };
    const payload = { courses: courseIds, file: 'test.pdf', fee: 1200, trainer: trainerId };

    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));

    await trainerMissionsHelper.upload(payload, credentials);

    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'ordre mission program Matrice FOR', file: 'test.pdf' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      {
        courses: courseIds,
        fee: 1200,
        trainer: trainerId,
        file: { publicId: 'yo', link: 'yo' },
        createdBy: credentials._id,
      }
    );
    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseIds[0] }, { trainer: 1, subProgram: 1 }] },
        {
          query: 'populate',
          args: [[
            { path: 'trainer', select: 'identity' },
            { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
          ]],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(TrainerMission, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return trainer missions as rof/admin', async () => {
    const credentials = { role: { vendor: { name: VENDOR_ADMIN } } };
    const trainerId = new ObjectId();
    const trainerMissions = [{
      trainer: trainerId,
      file: { publicId: 'mon premier upload', link: 'www.test.com' },
      date: '2023-12-10T23:00:00.000Z',
      courses: [{ _id: new ObjectId(), subProgram: { program: { name: 'name' } }, companies: [{ name: 'Alenvi' }] }],
      fee: 12,
      createdBy: new ObjectId(),
    }];

    find.returns(SinonMongoose.stubChainedQueries(trainerMissions, ['populate', 'setOptions', 'lean']));

    const result = await trainerMissionsHelper.list({ trainer: trainerId }, credentials);

    expect(result).toMatchObject(trainerMissions);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ trainer: trainerId }] },
        {
          query: 'populate',
          args: [{
            path: 'courses',
            select: 'misc type companies subProgram',
            populate: [
              { path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } },
              { path: 'companies', select: 'name' },
            ],
          }],
        },
        { query: 'setOptions', args: [{ isVendorUser: true }] },
        { query: 'lean' },
      ]
    );
  });
});
