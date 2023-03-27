const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const Course = require('../../../src/models/Course');
const TrainingContract = require('../../../src/models/TrainingContract');
const trainingContractsHelper = require('../../../src/helpers/trainingContracts');
const SinonMongoose = require('../sinonMongoose');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');

describe('create', () => {
  let uploadCourseFile;
  let courseFindOne;
  let create;

  beforeEach(() => {
    uploadCourseFile = sinon.stub(GCloudStorageHelper, 'uploadCourseFile');
    create = sinon.stub(TrainingContract, 'create');
    courseFindOne = sinon.stub(Course, 'findOne');
  });

  afterEach(() => {
    uploadCourseFile.restore();
    create.restore();
    courseFindOne.restore();
  });

  it('should create a training contract for INTRA course', async () => {
    const courseId = new ObjectId();
    const companyId = new ObjectId();
    const course = {
      _id: courseId,
      companies: [{ _id: companyId, name: 'Alenvi' }],
      subProgram: { program: { name: 'program' } },
    };
    const payload = { course: courseId, company: companyId, file: 'test.pdf' };

    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));

    await trainingContractsHelper.create(payload);

    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'convention_program_Alenvi', file: 'test.pdf' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      { course: courseId, company: companyId, file: { publicId: 'yo', link: 'yo' } }
    );
    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }, { companies: 1, subProgram: 1 }] },
        {
          query: 'populate',
          args: [[
            { path: 'companies', select: 'name' },
            { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
          ]],
        },
        { query: 'lean' },
      ]
    );
  });
});
