const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const attendanceSheetHelper = require('../../../src/helpers/attendanceSheets');
const SinonMongoose = require('../sinonMongoose');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');

describe('list', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(Course, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return attendance sheets from course', async () => {
    const courseId = new ObjectID();
    const attendanceSheets = [{
      course: courseId,
      file: {
        publicId: 'mon premier upload',
        link: 'www.test.com',
      },
      date: '2020-04-03T10:00:00',
    }];
    const returnedCourse = { _id: courseId, misc: 'name', type: 'intra', attendanceSheets };
    findOne.returns(SinonMongoose.stubChainedQueries([returnedCourse]));

    const result = await attendanceSheetHelper.list({ course: courseId });

    expect(result).toMatchObject(attendanceSheets);
    SinonMongoose.calledWithExactly(findOne, [
      { query: '', args: [{ _id: courseId }] },
      { query: 'populate', args: [{ path: 'attendanceSheets' }] },
      { query: 'lean' },
    ]);
  });
});

describe('create', () => {
  let uploadCourseFile;
  let create;
  let updateOne;

  beforeEach(() => {
    uploadCourseFile = sinon.stub(GCloudStorageHelper, 'uploadCourseFile');
    create = sinon.stub(AttendanceSheet, 'create');
    updateOne = sinon.stub(Course, 'updateOne');
  });

  afterEach(() => {
    uploadCourseFile.restore();
    create.restore();
    updateOne.restore();
  });

  it('should create an attendance sheet', async () => {
    const payload = { date: '2020-04-03T10:00:00', course: new ObjectID(), file: { hapi: { filename: 'test.pdf' } } };
    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });
    const attendanceSheetId = new ObjectID();
    create.returns({ _id: attendanceSheetId });

    await attendanceSheetHelper.create(payload);
    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'test.pdf', file: { hapi: { filename: 'test.pdf' } } }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      { course: payload.course, date: '2020-04-03T10:00:00', file: { publicId: 'yo', link: 'yo' } }
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: payload.course },
      { $push: { attendanceSheets: attendanceSheetId } }
    );
  });
});
