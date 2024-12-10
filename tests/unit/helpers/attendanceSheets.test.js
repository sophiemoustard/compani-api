const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const get = require('lodash/get');
const User = require('../../../src/models/User');
const Course = require('../../../src/models/Course');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const attendanceSheetHelper = require('../../../src/helpers/attendanceSheets');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');
const SinonMongoose = require('../sinonMongoose');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
const UtilsHelper = require('../../../src/helpers/utils');
const { VENDOR_ADMIN, COACH, COURSE, TRAINEE, HOLDING_ADMIN } = require('../../../src/helpers/constants');

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(AttendanceSheet, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return course attendance sheets as vendor role', async () => {
    const credentials = { role: { vendor: { name: VENDOR_ADMIN } } };
    const courseId = new ObjectId();
    const attendanceSheets = [{
      course: courseId,
      file: { publicId: 'mon premier upload', link: 'www.test.com' },
      date: '2020-04-03T10:00:00.000Z',
      companies: [new ObjectId()],
    }];

    find.returns(SinonMongoose.stubChainedQueries(attendanceSheets, ['populate', 'setOptions', 'lean']));

    const result = await attendanceSheetHelper.list({ course: courseId }, credentials);

    expect(result).toMatchObject(attendanceSheets);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ course: courseId }] },
        { query: 'populate', args: [{ path: 'trainee', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'slots', select: 'startDate endDate step' }] },
        { query: 'setOptions', args: [{ isVendorUser: !!get(credentials, 'role.vendor') }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return course attendance sheets as client user with company', async () => {
    const authCompanyId = new ObjectId();
    const credentials = { company: { _id: authCompanyId }, role: { client: { name: COACH } } };

    const courseId = new ObjectId();
    const attendanceSheets = [
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de authCompany', link: 'www.test.com' },
        trainee: { _id: new ObjectId(), identity: { firstname: 'Helo', name: 'World' } },
        companies: [authCompanyId],

      },
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de otherCompany', link: 'www.test.com' },
        trainee: { _id: new ObjectId(), identity: { firstname: 'Aline', name: 'Opiné' } },
        companies: [authCompanyId],
      },
    ];

    find.returns(SinonMongoose.stubChainedQueries(attendanceSheets, ['populate', 'setOptions', 'lean']));

    const result = await attendanceSheetHelper.list({ course: courseId, company: authCompanyId }, credentials);

    expect(result).toMatchObject(attendanceSheets);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ course: courseId, companies: { $in: [authCompanyId] } }] },
        { query: 'populate', args: [{ path: 'trainee', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'slots', select: 'startDate endDate step' }] },
        { query: 'setOptions', args: [{ isVendorUser: !!get(credentials, 'role.vendor') }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return course attendance sheets as holding user', async () => {
    const authCompanyId = new ObjectId();
    const otherCompanyId = new ObjectId();
    const holdingId = new ObjectId();
    const credentials = {
      company: { _id: authCompanyId },
      holding: { _id: holdingId, companies: [authCompanyId, otherCompanyId] },
      role: { client: { name: COACH }, holding: { name: HOLDING_ADMIN } },
    };

    const courseId = new ObjectId();
    const attendanceSheets = [
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de authCompany', link: 'www.test.com' },
        trainee: { _id: new ObjectId(), identity: { firstname: 'Helo', name: 'World' } },
        companies: [authCompanyId],
      },
      {
        course: courseId,
        file: { publicId: 'mon upload avec un trainne de otherCompany', link: 'www.test.com' },
        trainee: { _id: new ObjectId(), identity: { firstname: 'Aline', name: 'Opiné' } },
        companies: [otherCompanyId],
      },
    ];

    find.returns(SinonMongoose.stubChainedQueries(attendanceSheets, ['populate', 'setOptions', 'lean']));

    const result = await attendanceSheetHelper.list({ course: courseId, holding: holdingId }, credentials);

    expect(result).toMatchObject(attendanceSheets);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ course: courseId, companies: { $in: [authCompanyId, otherCompanyId] } }] },
        { query: 'populate', args: [{ path: 'trainee', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'slots', select: 'startDate endDate step' }] },
        { query: 'setOptions', args: [{ isVendorUser: !!get(credentials, 'role.vendor') }] },
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
  let getCompanyAtCourseRegistrationList;

  beforeEach(() => {
    uploadCourseFile = sinon.stub(GCloudStorageHelper, 'uploadCourseFile');
    userFindOne = sinon.stub(User, 'findOne');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    create = sinon.stub(AttendanceSheet, 'create');
    courseFindOne = sinon.stub(Course, 'findOne');
    getCompanyAtCourseRegistrationList = sinon
      .stub(CourseHistoriesHelper, 'getCompanyAtCourseRegistrationList');
  });

  afterEach(() => {
    uploadCourseFile.restore();
    userFindOne.restore();
    formatIdentity.restore();
    create.restore();
    courseFindOne.restore();
    getCompanyAtCourseRegistrationList.restore();
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
        companies: course.companies,
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
    sinon.assert.notCalled(getCompanyAtCourseRegistrationList);
  });

  it('should create an attendance sheet for INTER course', async () => {
    const courseId = new ObjectId();
    const traineeId = new ObjectId();
    const companyId = new ObjectId();

    const course = { _id: courseId, companies: [new ObjectId()] };
    const payload = { trainee: traineeId, course: courseId, file: 'test.pdf' };
    const user = { _id: traineeId, identity: { firstName: 'monsieur', lastname: 'patate' } };

    uploadCourseFile.returns({ publicId: 'yo', link: 'yo' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(user, ['lean']));
    formatIdentity.returns('monsieur PATATE');
    getCompanyAtCourseRegistrationList.returns([{ trainee: traineeId, company: companyId }]);

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
    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'emargement_monsieur PATATE', file: 'test.pdf' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      {
        course: courseId,
        trainee: traineeId,
        file: { publicId: 'yo', link: 'yo' },
        companies: [companyId],
      }
    );
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: courseId },
      { key: TRAINEE, value: [traineeId] }
    );
  });

  it('should create an attendance sheet with one slot for single course', async () => {
    const courseId = new ObjectId();
    const traineeId = new ObjectId();
    const companyId = new ObjectId();
    const slotId = new ObjectId();

    const course = { _id: courseId, companies: [new ObjectId()] };
    const payload = { trainee: traineeId, course: courseId, file: 'test.pdf', slots: slotId };
    const user = { _id: traineeId, identity: { firstName: 'Eren', lastname: 'JÄGER' } };

    uploadCourseFile.returns({ publicId: 'test', link: 'test' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(user, ['lean']));
    formatIdentity.returns('Eren JÄGER');
    getCompanyAtCourseRegistrationList.returns([{ trainee: traineeId, company: companyId }]);

    await attendanceSheetHelper.create(payload);

    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [{ query: 'findOne', args: [{ _id: courseId }, { companies: 1 }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [{ query: 'findOne', args: [{ _id: traineeId }, { identity: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(formatIdentity, { firstName: 'Eren', lastname: 'JÄGER' }, 'FL');
    sinon.assert.calledOnceWithExactly(uploadCourseFile, { fileName: 'emargement_Eren JÄGER', file: 'test.pdf' });
    sinon.assert.calledOnceWithExactly(
      create,
      {
        trainee: traineeId,
        course: courseId,
        slots: [slotId],
        companies: [companyId],
        file: { publicId: 'test', link: 'test' },
      }
    );
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: courseId },
      { key: TRAINEE, value: [traineeId] }
    );
  });

  it('should create an attendance sheet with multiple slots for single course', async () => {
    const courseId = new ObjectId();
    const traineeId = new ObjectId();
    const companyId = new ObjectId();
    const slots = [new ObjectId(), new ObjectId()];

    const course = { _id: courseId, companies: [new ObjectId()] };
    const payload = { trainee: traineeId, course: courseId, file: 'test.pdf', slots };
    const user = { _id: traineeId, identity: { firstName: 'Mikasa', lastname: 'ACKERMAN' } };

    uploadCourseFile.returns({ publicId: 'test', link: 'test' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(user, ['lean']));
    formatIdentity.returns('Mikasa ACKERMAN');
    getCompanyAtCourseRegistrationList.returns([{ trainee: traineeId, company: companyId }]);

    await attendanceSheetHelper.create(payload);

    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [{ query: 'findOne', args: [{ _id: courseId }, { companies: 1 }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [{ query: 'findOne', args: [{ _id: traineeId }, { identity: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(formatIdentity, { firstName: 'Mikasa', lastname: 'ACKERMAN' }, 'FL');
    sinon.assert.calledOnceWithExactly(uploadCourseFile, { fileName: 'emargement_Mikasa ACKERMAN', file: 'test.pdf' });
    sinon.assert.calledOnceWithExactly(
      create,
      {
        trainee: traineeId,
        course: courseId,
        slots,
        companies: [companyId],
        file: { publicId: 'test', link: 'test' },
      }
    );
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: courseId },
      { key: TRAINEE, value: [traineeId] }
    );
  });

  it('should upload trainer signature and create an attendance sheet', async () => {
    const courseId = new ObjectId();
    const traineeId = new ObjectId();
    const companyId = new ObjectId();
    const slots = [new ObjectId(), new ObjectId()];

    const course = { _id: courseId, companies: [new ObjectId()] };
    const payload = { trainee: traineeId, course: courseId, signature: 'signature.png', slots };
    const user = { _id: traineeId, identity: { firstName: 'Mikasa', lastname: 'ACKERMAN' } };

    uploadCourseFile.returns({ publicId: '123', link: 'http://signature' });
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['lean']));
    userFindOne.returns(SinonMongoose.stubChainedQueries(user, ['lean']));
    formatIdentity.returns('Mikasa ACKERMAN');
    getCompanyAtCourseRegistrationList.returns([{ trainee: traineeId, company: companyId }]);

    await attendanceSheetHelper.create(payload);

    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [{ query: 'findOne', args: [{ _id: courseId }, { companies: 1 }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [{ query: 'findOne', args: [{ _id: traineeId }, { identity: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(formatIdentity, { firstName: 'Mikasa', lastname: 'ACKERMAN' }, 'FL');
    sinon.assert.calledOnceWithExactly(
      uploadCourseFile,
      { fileName: 'trainer_signature_Mikasa ACKERMAN', file: 'signature.png' }
    );
    sinon.assert.calledOnceWithExactly(
      create,
      {
        trainee: traineeId,
        course: courseId,
        slots,
        companies: [companyId],
        signatures: { trainer: 'http://signature' },
      }
    );
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: courseId },
      { key: TRAINEE, value: [traineeId] }
    );
  });
});

describe('update', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(AttendanceSheet, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update an attendance sheet', async () => {
    const slotId = new ObjectId();
    const attendanceSheet = { _id: new ObjectId() };
    const payload = { slots: [slotId] };
    await attendanceSheetHelper.update(attendanceSheet._id, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: attendanceSheet._id }, { $set: payload });
  });
});

describe('delete', () => {
  let findOne;
  let deleteOne;
  let deleteCourseFile;
  beforeEach(() => {
    findOne = sinon.stub(AttendanceSheet, 'findOne');
    deleteOne = sinon.stub(AttendanceSheet, 'deleteOne');
    deleteCourseFile = sinon.stub(GCloudStorageHelper, 'deleteCourseFile');
  });
  afterEach(() => {
    findOne.restore();
    deleteOne.restore();
    deleteCourseFile.restore();
  });

  it('should remove an attendance sheet', async () => {
    const attendanceSheetId = new ObjectId();
    const attendanceSheet = { _id: attendanceSheetId, file: { publicId: 'yo' } };

    findOne.returns(SinonMongoose.stubChainedQueries(attendanceSheet, ['lean']));

    await attendanceSheetHelper.delete(attendanceSheetId);

    sinon.assert.calledWithExactly(deleteCourseFile, 'yo');
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: attendanceSheetId });
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: attendanceSheetId }] }, { query: 'lean' }]
    );
  });
});
