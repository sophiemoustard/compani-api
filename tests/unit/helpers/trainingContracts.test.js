const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const Course = require('../../../src/models/Course');
const TrainingContract = require('../../../src/models/TrainingContract');
const trainingContractsHelper = require('../../../src/helpers/trainingContracts');
const SinonMongoose = require('../sinonMongoose');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
const { VENDOR_ADMIN, COACH } = require('../../../src/helpers/constants');

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

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(TrainingContract, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return course training contracts as vendor role', async () => {
    const credentials = { role: { vendor: { name: VENDOR_ADMIN } } };
    const courseId = new ObjectId();
    const trainingContracts = [{
      course: courseId,
      file: { publicId: 'mon premier upload', link: 'www.test.com' },
      company: new ObjectId(),
    }];

    find.returns(SinonMongoose.stubChainedQueries(trainingContracts, ['setOptions', 'lean']));

    const result = await trainingContractsHelper.list(courseId, credentials);

    expect(result).toMatchObject(trainingContracts);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ course: courseId }] },
        { query: 'setOptions', args: [{ isVendorUser: true }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return course training contracts as client user with company', async () => {
    const authCompanyId = new ObjectId();
    const credentials = { company: { _id: authCompanyId }, role: { client: { name: COACH } } };

    const courseId = new ObjectId();
    const trainingContracts = [
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de authCompany', link: 'www.test.com' },
        company: authCompanyId,
      },
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de otherCompany', link: 'www.test.com' },
        company: new ObjectId(),
      },
    ];

    find.returns(SinonMongoose.stubChainedQueries(trainingContracts, ['setOptions', 'lean']));

    const result = await trainingContractsHelper.list(courseId, credentials);

    expect(result).toMatchObject(trainingContracts);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ course: courseId, company: authCompanyId }] },
        { query: 'setOptions', args: [{ isVendorUser: false }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('delete', () => {
  let findOne;
  let deleteOne;
  let deleteCourseFile;
  beforeEach(() => {
    findOne = sinon.stub(TrainingContract, 'findOne');
    deleteOne = sinon.stub(TrainingContract, 'deleteOne');
    deleteCourseFile = sinon.stub(GCloudStorageHelper, 'deleteCourseFile');
  });
  afterEach(() => {
    findOne.restore();
    deleteOne.restore();
    deleteCourseFile.restore();
  });

  it('should remove a training contract', async () => {
    const trainingContract = { _id: new ObjectId(), file: { publicId: 'yo' } };

    findOne.returns(SinonMongoose.stubChainedQueries(trainingContract, ['lean']));

    await trainingContractsHelper.delete(trainingContract._id);

    sinon.assert.calledOnceWithExactly(deleteCourseFile, 'yo');
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: trainingContract._id });
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: trainingContract._id }] },
        // { query: 'setOptions', args: [{ isVendorUser: !!get(credentials, 'role.vendor') }] },
        { query: 'lean' },
      ]
    );
  });
});
