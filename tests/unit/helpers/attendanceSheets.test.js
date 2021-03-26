const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const User = require('../../../src/models/User');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
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
    const courseId = new ObjectID();
    const attendanceSheets = [{
      course: courseId,
      file: { publicId: 'mon premier upload', link: 'www.test.com' },
      date: '2020-04-03T10:00:00',
    }];

    find.returns(SinonMongoose.stubChainedQueries([attendanceSheets]));

    const result = await attendanceSheetHelper.list(courseId, null);

    expect(result).toMatchObject(attendanceSheets);
    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [{ course: courseId }] },
      { query: 'lean' },
    ]);
  });

  it('should return course attendance sheets from logged user company', async () => {
    const courseId = new ObjectID();
    const authCompanyId = new ObjectID();
    const otherCompanyId = new ObjectID();
    const attendanceSheets = [
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de authCompany', link: 'www.test.com' },
        trainee: { _id: new ObjectID(), company: authCompanyId },
      },
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de otherCompany', link: 'www.test.com' },
        trainee: { _id: new ObjectID(), company: otherCompanyId },
      },
    ];

    find.returns(SinonMongoose.stubChainedQueries([attendanceSheets]));

    const result = await attendanceSheetHelper.list(courseId, authCompanyId);

    expect(result).toMatchObject([attendanceSheets[0]]);
    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [{ course: courseId }] },
      { query: 'lean' },
    ]);
  });
});

describe('create', () => {
  let uploadCourseFile;
  let findOne;
  let formatIdentity;
  let create;

  beforeEach(() => {
    uploadCourseFile = sinon.stub(GCloudStorageHelper, 'uploadCourseFile');
    findOne = sinon.stub(User, 'findOne');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    create = sinon.stub(AttendanceSheet, 'create');
  });

  afterEach(() => {
    uploadCourseFile.restore();
    findOne.restore();
    formatIdentity.restore();
    create.restore();
  });

  it('should create an attendance sheet for INTRA course', async () => {
    const payload = { date: '2020-04-03T10:00:00', course: new ObjectID(), file: 'test.pdf' };
    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });

    await attendanceSheetHelper.create(payload);
    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'emargement_03-avril-2020', file: 'test.pdf' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      { course: payload.course, date: '2020-04-03T10:00:00', file: { publicId: 'yo', link: 'yo' } }
    );

    sinon.assert.notCalled(findOne);
    sinon.assert.notCalled(formatIdentity);
  });

  it('should create an attendance sheet for INTER course', async () => {
    const payload = { trainee: 'id de quelqun', course: new ObjectID(), file: 'test.pdf' };
    const returnedUser = { identity: { firstName: 'monsieur', lastname: 'patate' } };
    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });
    findOne.returns(SinonMongoose.stubChainedQueries([returnedUser]));
    formatIdentity.returns('monsieurPATATE');

    await attendanceSheetHelper.create(payload);
    SinonMongoose.calledWithExactly(findOne, [
      { query: '', args: [{ _id: 'id de quelqun' }] },
      { query: 'lean' },
    ]);
    sinon.assert.calledOnceWithExactly(
      formatIdentity,
      { firstName: 'monsieur', lastname: 'patate' },
      'FL'
    );
    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'emargement_monsieurPATATE', file: 'test.pdf' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      { course: payload.course, trainee: 'id de quelqun', file: { publicId: 'yo', link: 'yo' } }
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
    const attendanceSheet = { _id: new ObjectID(), file: { publicId: 'yo' } };

    await attendanceSheetHelper.delete(attendanceSheet);

    sinon.assert.calledOnceWithExactly(deleteCourseFile, 'yo');
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: attendanceSheet._id });
  });
});
