const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const Course = require('../../../src/models/Course');
const TrainerMission = require('../../../src/models/TrainerMission');
const trainerMissionsHelper = require('../../../src/helpers/trainerMissions');
const SinonMongoose = require('../sinonMongoose');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');

describe('create', () => {
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

  it('should create a trainer mission', async () => {
    const credentials = { _id: new ObjectId() };
    const courseId = new ObjectId();
    const trainerId = new ObjectId();
    const course = {
      _id: courseId,
      trainer: { _id: trainerId, identity: { lastname: 'For', firstname: 'Matrice' } },
      subProgram: { program: { name: 'program' } },
    };
    const payload = {
      courses: [courseId],
      file: 'test.pdf',
      fee: 1200,
      trainer: trainerId,
      date: '2023-12-10T22:00:00.000Z',
    };

    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));

    await trainerMissionsHelper.create(payload, credentials);

    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'ordre_mission_program_Matrice_FOR', file: 'test.pdf' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      {
        courses: [courseId],
        fee: 1200,
        trainer: trainerId,
        date: '2023-12-10T22:00:00.000Z',
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
});
