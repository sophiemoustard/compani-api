const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const User = require('../../../src/models/User');
const Course = require('../../../src/models/Course');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const UserCompany = require('../../../src/models/UserCompany');
const attendanceSheetHelper = require('../../../src/helpers/attendanceSheets');
const SinonMongoose = require('../sinonMongoose');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
const UtilsHelper = require('../../../src/helpers/utils');

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(AttendanceSheet, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return course attendance sheets', async () => {
    const courseId = new ObjectId();
    const attendanceSheets = [{
      course: courseId,
      file: { publicId: 'mon premier upload', link: 'www.test.com' },
      date: '2020-04-03T10:00:00.000Z',
    }];

    find.returns(SinonMongoose.stubChainedQueries(attendanceSheets));

    const result = await attendanceSheetHelper.list(courseId, null);

    expect(result).toMatchObject(attendanceSheets);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ course: courseId }] },
        { query: 'populate', args: [{ path: 'trainee', select: 'identity company', populate: { path: 'company' } }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return course attendance sheets from logged user company', async () => {
    const courseId = new ObjectId();
    const authCompanyId = new ObjectId();
    const otherCompanyId = new ObjectId();
    const attendanceSheets = [
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de authCompany', link: 'www.test.com' },
        trainee: { _id: new ObjectId(), company: authCompanyId, identity: { firstname: 'Helo', name: 'World' } },
      },
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de otherCompany', link: 'www.test.com' },
        trainee: { _id: new ObjectId(), company: otherCompanyId, identity: { firstname: 'Aline', name: 'Opiné' } },
      },
    ];

    find.returns(SinonMongoose.stubChainedQueries(attendanceSheets));

    const result = await attendanceSheetHelper.list(courseId, authCompanyId);

    expect(result).toMatchObject([attendanceSheets[0]]);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ course: courseId }] },
        { query: 'populate', args: [{ path: 'trainee', select: 'identity company', populate: { path: 'company' } }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('create', () => {
  let uploadCourseFile;
  let userFindOne;
  let formatIdentity;
  let create;
  let courseFindOne;
  let userCompanyFindOne;

  beforeEach(() => {
    uploadCourseFile = sinon.stub(GCloudStorageHelper, 'uploadCourseFile');
    userFindOne = sinon.stub(User, 'findOne');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    create = sinon.stub(AttendanceSheet, 'create');
    courseFindOne = sinon.stub(Course, 'findOne');
    userCompanyFindOne = sinon.stub(UserCompany, 'findOne');
  });

  afterEach(() => {
    uploadCourseFile.restore();
    userFindOne.restore();
    formatIdentity.restore();
    create.restore();
    courseFindOne.restore();
    userCompanyFindOne.restore();
  });

  it('should create an attendance sheet for INTRA course', async () => {
    const courseId = new ObjectId();
    const course = { _id: courseId, companies: [new ObjectId()] };
    const payload = { date: '2020-04-03T10:00:00.000Z', course: courseId, file: 'test.pdf' };

    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['lean']));

    await attendanceSheetHelper.create(payload);

    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'emargement_3 avril 2020', file: 'test.pdf' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      {
        course: courseId,
        date: '2020-04-03T10:00:00.000Z',
        file: { publicId: 'yo', link: 'yo' },
        company: course.companies[0],
      }
    );
    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }, { companies: 1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(formatIdentity);
    sinon.assert.notCalled(userCompanyFindOne);
  });

  it('should create an attendance sheet for INTER course', async () => {
    const courseId = new ObjectId();
    const traineeId = new ObjectId();
    const companyId = new ObjectId();

    const course = { _id: courseId, companies: [new ObjectId()] };
    const payload = { trainee: traineeId, course: courseId, file: 'test.pdf' };
    const user = { _id: traineeId, identity: { firstName: 'monsieur', lastname: 'patate' } };
    const userCompany = { user: traineeId, company: companyId };

    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(user, ['lean']));
    formatIdentity.returns('monsieurPATATE');
    userCompanyFindOne.returns(SinonMongoose.stubChainedQueries(userCompany, ['lean']));

    await attendanceSheetHelper.create(payload);

    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }, { companies: 1 }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: traineeId }, { identity: 1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      formatIdentity,
      { firstName: 'monsieur', lastname: 'patate' },
      'FL'
    );
    SinonMongoose.calledOnceWithExactly(
      userCompanyFindOne,
      [{ query: 'findOne', args: [{ user: traineeId }, { company: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'emargement_monsieurPATATE', file: 'test.pdf' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      {
        course: courseId,
        trainee: traineeId,
        file: { publicId: 'yo', link: 'yo' },
        company: companyId,
      }
    );
  });
});

describe('delete', () => {
  let deleteOne;
  let deleteCourseFile;
  beforeEach(() => {
    deleteOne = sinon.stub(AttendanceSheet, 'deleteOne');
    deleteCourseFile = sinon.stub(GCloudStorageHelper, 'deleteCourseFile');
  });
  afterEach(() => {
    deleteOne.restore();
    deleteCourseFile.restore();
  });

  it('should remove an attendance sheet', async () => {
    const attendanceSheet = { _id: new ObjectId(), file: { publicId: 'yo' } };

    await attendanceSheetHelper.delete(attendanceSheet);

    sinon.assert.calledOnceWithExactly(deleteCourseFile, 'yo');
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: attendanceSheet._id });
  });
});
