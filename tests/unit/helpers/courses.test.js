const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const fs = require('fs');
const os = require('os');
const { PassThrough } = require('stream');
const { fn: momentProto } = require('moment');
const Course = require('../../../src/models/Course');
const CourseSmsHistory = require('../../../src/models/CourseSmsHistory');
const User = require('../../../src/models/User');
const Role = require('../../../src/models/Role');
const Drive = require('../../../src/models/Google/Drive');
const CourseHelper = require('../../../src/helpers/courses');
const TwilioHelper = require('../../../src/helpers/twilio');
const UsersHelper = require('../../../src/helpers/users');
const UtilsHelper = require('../../../src/helpers/utils');
const PdfHelper = require('../../../src/helpers/pdf');
const ZipHelper = require('../../../src/helpers/zip');
const DocxHelper = require('../../../src/helpers/docx');
const CourseRepository = require('../../../src/repositories/CourseRepository');
const moment = require('moment');
require('sinon-mongoose');

describe('createCourse', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(Course.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should create an intra course', async () => {
    const newCourse = { misc: 'name', company: new ObjectID(), subProgram: new ObjectID(), type: 'intra' };

    const result = await CourseHelper.createCourse(newCourse);
    expect(result.misc).toEqual(newCourse.misc);
    expect(result.subProgram).toEqual(newCourse.subProgram);
    expect(result.company).toEqual(newCourse.company);
  });
});

describe('list', () => {
  let findCourseAndPopulate;
  let CourseMock;
  const authCompany = new ObjectID();

  beforeEach(() => {
    findCourseAndPopulate = sinon.stub(CourseRepository, 'findCourseAndPopulate');
    CourseMock = sinon.mock(Course);
  });
  afterEach(() => {
    findCourseAndPopulate.restore();
    CourseMock.restore();
  });

  it('should return courses', async () => {
    const coursesList = [{ misc: 'name' }, { misc: 'program' }];

    findCourseAndPopulate.returns(coursesList);
    CourseMock.expects('findOne').never();

    const result = await CourseHelper.list({ trainer: '1234567890abcdef12345678' });
    expect(result).toMatchObject(coursesList);
    sinon.assert.calledWithExactly(findCourseAndPopulate, { trainer: '1234567890abcdef12345678' });
    CourseMock.verify();
  });

  it('should return courses, called with query.trainees', async () => {
    const query = { trainees: '1234567890abcdef12345612' };
    const coursesList = [
      {
        misc: 'Groupe 2',
        trainees: [{ identity: { firstname: 'Shalom' }, company: { _id: authCompany } }],
      },
    ];

    CourseMock.expects('find')
      .withExactArgs(query, { misc: 1 })
      .chain('populate')
      .withExactArgs({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } })
      .chain('populate')
      .withExactArgs({ path: 'slots', select: 'startDate endDate' })
      .chain('populate')
      .withExactArgs({ path: 'slotsToPlan', select: '_id' })
      .chain('lean')
      .once()
      .returns(coursesList);

    const result = await CourseHelper.list(query);
    expect(result).toMatchObject(coursesList);
    sinon.assert.notCalled(findCourseAndPopulate);
    CourseMock.verify();
  });

  it('should return courses, called with query.company', async () => {
    const coursesList = [
      { misc: 'name', type: 'intra' },
      {
        misc: 'program',
        type: 'inter_b2b',
        trainees: [{ identity: { firstname: 'Bonjour' }, company: { _id: authCompany } }],
      },
    ];
    const returnedList = [
      { misc: 'name', type: 'intra' },
      {
        misc: 'program',
        type: 'inter_b2b',
        companies: ['1234567890abcdef12345678', authCompany.toHexString()],
        trainees: [
          { identity: { firstname: 'Bonjour' }, company: { _id: authCompany } },
          { identity: { firstname: 'Au revoir' }, company: { _id: new ObjectID() } },
        ],
      },
    ];

    findCourseAndPopulate.onFirstCall()
      .returns([returnedList[0]])
      .onSecondCall()
      .returns([returnedList[1]]);

    CourseMock.expects('findOne').never();

    const result = await CourseHelper.list({ company: authCompany.toHexString(), trainer: '1234567890abcdef12345678' });
    expect(result).toMatchObject(coursesList);
    expect(findCourseAndPopulate.getCall(0)
      .calledWithExactly({ company: authCompany, trainer: '1234567890abcdef12345678', type: 'intra' }));
    expect(findCourseAndPopulate.getCall(1)
      .calledWithExactly({ trainer: '1234567890abcdef12345678', type: 'inter_b2b' }));
    CourseMock.verify();
  });
});

describe('listUserCourses', () => {
  let CourseMock;

  beforeEach(() => {
    CourseMock = sinon.mock(Course);
  });
  afterEach(() => {
    CourseMock.restore();
  });

  it('should return courses', async () => {
    const coursesList = [{ misc: 'name' }, { misc: 'program' }];

    CourseMock.expects('find')
      .withExactArgs({ trainees: '1234567890abcdef12345678' })
      .chain('populate')
      .withExactArgs({
        path: 'subProgram',
        select: 'program steps',
        populate: { path: 'program', select: 'name image' },
      })
      .chain('populate')
      .withExactArgs({ path: 'slots', select: 'startDate endDate step', populate: { path: 'step', select: 'type' } })
      .chain('select')
      .withExactArgs('_id')
      .chain('lean')
      .returns(coursesList);

    const result = await CourseHelper.listUserCourses({ _id: '1234567890abcdef12345678' });
    expect(result).toMatchObject(coursesList);
  });
});

describe('getCourse', () => {
  let CourseMock;
  const authCompanyId = new ObjectID();
  const course = {
    _id: new ObjectID(),
    type: 'inter_b2b',
    trainees: [
      { _id: new ObjectID(), company: authCompanyId },
      { _id: new ObjectID(), company: new ObjectID() },
    ],
  };
  beforeEach(() => {
    CourseMock = sinon.mock(Course);
  });
  afterEach(() => {
    CourseMock.restore();
  });

  it('should return inter b2b course without trainees filtering', async () => {
    CourseMock.expects('findOne')
      .withExactArgs({ _id: course._id })
      .chain('populate')
      .withExactArgs({ path: 'company', select: 'name' })
      .chain('populate')
      .withExactArgs({
        path: 'subProgram',
        select: 'program steps',
        populate: [{ path: 'program', select: 'name learningGoals' }, { path: 'steps', select: 'name type' }],
      })
      .chain('populate')
      .withExactArgs({ path: 'slots', populate: { path: 'step', select: 'name' } })
      .chain('populate')
      .withExactArgs({ path: 'slotsToPlan', select: '_id' })
      .chain('populate')
      .withExactArgs({
        path: 'trainees',
        select: 'identity.firstname identity.lastname local.email company contact ',
        populate: { path: 'company', select: 'name' },
        match: {},
      })
      .chain('populate')
      .withExactArgs({ path: 'trainer', select: 'identity.firstname identity.lastname' })
      .chain('lean')
      .once()
      .returns(course);

    const result = await CourseHelper.getCourse(
      course._id,
      { role: { vendor: { name: 'vendor_admin' } }, company: { _id: authCompanyId } }
    );
    expect(result).toMatchObject(course);
    expect(result.trainees.length).toEqual(2);
  });

  it('should return inter b2b course with trainees filtering', async () => {
    CourseMock.expects('findOne')
      .withExactArgs({ _id: course._id })
      .chain('populate')
      .withExactArgs({ path: 'company', select: 'name' })
      .chain('populate')
      .withExactArgs({
        path: 'subProgram',
        select: 'program steps',
        populate: [{ path: 'program', select: 'name learningGoals' }, { path: 'steps', select: 'name type' }],
      })
      .chain('populate')
      .withExactArgs({ path: 'slots', populate: { path: 'step', select: 'name' } })
      .chain('populate')
      .withExactArgs({ path: 'slotsToPlan', select: '_id' })
      .chain('populate')
      .withExactArgs({
        path: 'trainees',
        select: 'identity.firstname identity.lastname local.email company contact ',
        populate: { path: 'company', select: 'name' },
        match: { company: authCompanyId },
      })
      .chain('populate')
      .withExactArgs({ path: 'trainer', select: 'identity.firstname identity.lastname' })
      .chain('lean')
      .once()
      .returns({ ...course, trainees: [course.trainees[0]] });

    const result = await CourseHelper.getCourse(
      course._id,
      { role: { client: { name: 'client_admin' } }, company: { _id: authCompanyId } }
    );
    expect(result.trainees.length).toEqual(1);
  });
});

describe('getCoursePublicInfos', () => {
  let CourseMock;
  beforeEach(() => {
    CourseMock = sinon.mock(Course);
  });
  afterEach(() => {
    CourseMock.restore();
  });

  it('should return courses', async () => {
    const course = { _id: new ObjectID() };

    CourseMock.expects('findOne')
      .withExactArgs({ _id: course._id })
      .chain('populate')
      .withExactArgs({
        path: 'subProgram',
        select: 'program',
        populate: { path: 'program', select: 'name learningGoals' },
      })
      .chain('populate')
      .withExactArgs('slots')
      .chain('populate')
      .withExactArgs({ path: 'slotsToPlan', select: '_id' })
      .chain('populate')
      .withExactArgs({ path: 'trainer', select: 'identity.firstname identity.lastname biography' })
      .chain('lean')
      .once()
      .returns(course);

    const result = await CourseHelper.getCoursePublicInfos(course._id);
    expect(result).toMatchObject(course);
  });
});

describe('getTraineeCourse', () => {
  let CourseMock;
  beforeEach(() => {
    CourseMock = sinon.mock(Course);
  });
  afterEach(() => {
    CourseMock.restore();
  });

  it('should return courses', async () => {
    const course = { _id: new ObjectID() };

    CourseMock.expects('findOne')
      .withExactArgs({ _id: course._id })
      .chain('populate')
      .withExactArgs({
        path: 'subProgram',
        select: 'program steps',
        populate: [{ path: 'program', select: 'name image' }, { path: 'steps', select: 'name type' }],
      })
      .chain('populate')
      .withExactArgs({ path: 'slots', select: 'startDate endDate step address' })
      .chain('select')
      .withExactArgs('_id')
      .chain('lean')
      .once()
      .returns(course);

    const result = await CourseHelper.getTraineeCourse(course._id);
    expect(result).toMatchObject(course);
  });
});

describe('updateCourse', () => {
  let CourseMock;
  beforeEach(() => {
    CourseMock = sinon.mock(Course, 'CourseMock');
  });
  afterEach(() => {
    CourseMock.restore();
  });

  it('should update an intra course', async () => {
    const courseId = new ObjectID();
    const payload = { misc: 'groupe 4' };
    CourseMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: courseId }, { $set: payload })
      .chain('lean')
      .returns(payload);

    const result = await CourseHelper.updateCourse(courseId, payload);
    expect(result.misc).toEqual(payload.misc);
  });
});

describe('sendSMS', () => {
  const courseId = new ObjectID();
  const trainees = [
    { contact: { phone: '0123456789' }, identity: { firstname: 'non', lasname: 'ok' }, _id: 'qwertyuio' },
    { contact: { phone: '0987654321' }, identity: { firstname: 'test', lasname: 'ok' }, _id: 'asdfghjkl' },
    { contact: {}, identity: { firstname: 'test', lasname: 'ko' }, _id: 'poiuytrewq' },
  ];
  const payload = { body: 'Ceci est un test.' };
  const credentials = { _id: new ObjectID() };

  let CourseMock;
  let CourseSmsHistoryMock;
  let UserMock;
  let sendStub;
  beforeEach(() => {
    CourseMock = sinon.mock(Course);
    CourseSmsHistoryMock = sinon.mock(CourseSmsHistory);
    UserMock = sinon.mock(User);
    sendStub = sinon.stub(TwilioHelper, 'send');
  });
  afterEach(() => {
    CourseMock.restore();
    CourseSmsHistoryMock.restore();
    UserMock.restore();
    sendStub.restore();
  });

  it('should sens SMS to trainees and save missing phone trainee id', async () => {
    CourseMock.expects('findById')
      .withExactArgs(courseId)
      .chain('populate')
      .withExactArgs({ path: 'trainees', select: '_id contact' })
      .chain('lean')
      .returns({ trainees });

    sendStub.returns();

    CourseSmsHistoryMock.expects('create')
      .withExactArgs({
        type: payload.type,
        course: courseId,
        message: payload.body,
        sender: credentials._id,
        missingPhones: ['poiuytrewq'],
      })
      .returns();

    await CourseHelper.sendSMS(courseId, payload, credentials);

    sinon.assert.calledWith(
      sendStub.getCall(0),
      { to: `+33${trainees[0].contact.phone.substring(1)}`, from: 'Compani', body: payload.body }
    );
    sinon.assert.calledWithExactly(
      sendStub.getCall(1),
      { to: `+33${trainees[1].contact.phone.substring(1)}`, from: 'Compani', body: payload.body }
    );
    CourseMock.verify();
    CourseSmsHistoryMock.verify();
    UserMock.verify();
  });
});

describe('getSMSHistory', () => {
  const courseId = new ObjectID();
  const sms = [{ type: 'convocation', message: 'Hello, this is a test' }];
  let CourseSmsHistoryMock;
  beforeEach(() => {
    CourseSmsHistoryMock = sinon.mock(CourseSmsHistory);
  });
  afterEach(() => {
    CourseSmsHistoryMock.restore();
  });

  it('should get SMS history', async () => {
    CourseSmsHistoryMock.expects('find')
      .withExactArgs({ course: courseId })
      .chain('populate')
      .withExactArgs({ path: 'sender', select: 'identity.firstname identity.lastname' })
      .chain('populate')
      .withExactArgs({ path: 'missingPhones', select: 'identity.firstname identity.lastname' })
      .chain('lean')
      .returns(sms);

    const result = await CourseHelper.getSMSHistory(courseId);

    expect(result).toEqual(sms);
    CourseSmsHistoryMock.verify();
  });
});

describe('addCourseTrainee', () => {
  let CourseMock;
  let RoleMock;
  let createUserStub;
  let updateUserStub;
  beforeEach(() => {
    CourseMock = sinon.mock(Course, 'CourseMock');
    RoleMock = sinon.mock(Role, 'RoleMock');
    createUserStub = sinon.stub(UsersHelper, 'createUser');
    updateUserStub = sinon.stub(UsersHelper, 'updateUser');
  });
  afterEach(() => {
    CourseMock.restore();
    RoleMock.restore();
    createUserStub.restore();
    updateUserStub.restore();
  });

  it('should add a course trainee using existing user', async () => {
    const user = { _id: new ObjectID(), company: new ObjectID() };
    const course = { _id: new ObjectID(), misc: 'Test' };
    const payload = { local: { email: 'toto@toto.com' } };

    CourseMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: course._id }, { $addToSet: { trainees: user._id } }, { new: true })
      .chain('lean')
      .returns({ ...course, trainee: [user._id] });

    const result = await CourseHelper.addCourseTrainee(course._id, payload, user);
    expect(result.trainee).toEqual(expect.arrayContaining([user._id]));
    CourseMock.verify();
    sinon.assert.notCalled(createUserStub);
    sinon.assert.notCalled(updateUserStub);
  });

  it('should add a course trainee creating new user without role', async () => {
    const user = { _id: new ObjectID() };
    const course = { _id: new ObjectID(), misc: 'Test' };
    const payload = { local: { email: 'toto@toto.com' } };

    createUserStub.returns(user);
    RoleMock.expects('findOne').never();
    CourseMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: course._id }, { $addToSet: { trainees: user._id } }, { new: true })
      .chain('lean')
      .returns({ ...course, trainee: [user._id] });

    const result = await CourseHelper.addCourseTrainee(course._id, payload, null);
    expect(result.trainee).toEqual(expect.arrayContaining([user._id]));
    CourseMock.verify();
    RoleMock.verify();
    sinon.assert.calledWithExactly(createUserStub, payload);
    sinon.assert.notCalled(updateUserStub);
  });

  it('should add a course trainee, and update it by adding his company', async () => {
    const user = { _id: new ObjectID() };
    const course = { _id: new ObjectID(), misc: 'Test' };
    const payload = { local: { email: 'toto@toto.com' }, company: new ObjectID() };

    CourseMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: course._id }, { $addToSet: { trainees: user._id } }, { new: true })
      .chain('lean')
      .returns({ ...course, trainee: [user._id] });

    const result = await CourseHelper.addCourseTrainee(course._id, payload, user);
    expect(result.trainee).toEqual(expect.arrayContaining([user._id]));
    sinon.assert.calledWithExactly(updateUserStub, user._id, { company: payload.company }, null);
    CourseMock.verify();
    sinon.assert.notCalled(createUserStub);
  });
});

describe('removeCourseTrainee', () => {
  let CourseMock;
  beforeEach(() => {
    CourseMock = sinon.mock(Course, 'CourseMock');
  });
  afterEach(() => {
    CourseMock.restore();
  });

  it('should remove a course trainee', async () => {
    const courseId = new ObjectID();
    const traineeId = new ObjectID();
    CourseMock.expects('updateOne')
      .withExactArgs({ _id: courseId }, { $pull: { trainees: traineeId } })
      .chain('lean');

    await CourseHelper.removeCourseTrainee(courseId, traineeId);
    CourseMock.verify();
  });
});

describe('formatCourseSlotsForPdf', () => {
  it('should format slot for pdf', () => {
    const slot = {
      startDate: '2020-03-20T09:00:00',
      endDate: '2020-03-20T11:00:00',
      address: { fullAddress: 'je suis une adress' },
    };

    const result = CourseHelper.formatCourseSlotsForPdf(slot);

    expect(result).toEqual({
      address: 'je suis une adress',
      date: '20/03/2020',
      startHour: '09:00',
      endHour: '11:00',
      duration: '2h',
    });
  });
});

describe('getCourseDuration', () => {
  let formatDuration;
  beforeEach(() => {
    formatDuration = sinon.stub(UtilsHelper, 'formatDuration');
  });
  afterEach(() => {
    formatDuration.restore();
  });

  it('should return course duration with minutes', () => {
    const slots = [
      { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00' },
      { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:30:00' },
    ];
    formatDuration.returns('4h30');

    const result = CourseHelper.getCourseDuration(slots);

    expect(result).toEqual('4h30');
    sinon.assert.calledOnceWithExactly(formatDuration, moment.duration({ hours: 4, minutes: 30 }));
  });
  it('should return course duration with leading zero minutes', () => {
    const slots = [
      { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:08:00' },
      { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:00:00' },
    ];
    formatDuration.returns('4h08');

    const result = CourseHelper.getCourseDuration(slots);

    expect(result).toEqual('4h08');
    sinon.assert.calledOnceWithExactly(formatDuration, moment.duration({ hours: 4, minutes: 8 }));
  });
  it('should return course duration without minutes', () => {
    const slots = [
      { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00' },
      { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:00:00' },
    ];
    formatDuration.returns('4h');

    const result = CourseHelper.getCourseDuration(slots);

    expect(result).toEqual('4h');
    sinon.assert.calledOnceWithExactly(formatDuration, moment.duration({ hours: 4 }));
  });
  it('should return course duration with days', () => {
    const slots = [
      { startDate: '2020-03-20T07:00:00', endDate: '2020-03-20T22:00:00' },
      { startDate: '2020-04-21T07:00:00', endDate: '2020-04-21T22:00:00' },
    ];
    formatDuration.returns('30h');

    const result = CourseHelper.getCourseDuration(slots);

    expect(result).toEqual('30h');
    sinon.assert.calledOnceWithExactly(formatDuration, moment.duration({ hours: 30 }));
  });
});

describe('formatCourseForPdf', () => {
  let formatIdentity;
  let getCourseDuration;
  let formatCourseSlotsForPdf;
  beforeEach(() => {
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    getCourseDuration = sinon.stub(CourseHelper, 'getCourseDuration');
    formatCourseSlotsForPdf = sinon.stub(CourseHelper, 'formatCourseSlotsForPdf');
  });
  afterEach(() => {
    formatIdentity.restore();
    getCourseDuration.restore();
    formatCourseSlotsForPdf.restore();
  });

  it('should format course for pdf', () => {
    const course = {
      slots: [
        { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00' },
        { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:30:00' },
        { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00' },
      ],
      misc: 'des infos en plus',
      trainer: { identity: { lastname: 'MasterClass' } },
      trainees: [
        { identity: { lastname: 'trainee 1' }, company: { name: 'alenvi', tradeName: 'Pfiou' } },
        { identity: { lastname: 'trainee 2' }, company: { name: 'alenvi', tradeName: 'Pfiou' } },
      ],
      subProgram: { program: { name: 'programme de formation' } },
    };
    const sortedSlots = [
      { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00' },
      { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00' },
      { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:30:00' },
    ];
    formatCourseSlotsForPdf.returns('slot');
    formatIdentity.onCall(0).returns('Pere Castor');
    formatIdentity.onCall(1).returns('trainee 1');
    formatIdentity.onCall(2).returns('trainee 2');
    getCourseDuration.returns('7h');

    const result = CourseHelper.formatCourseForPdf(course);

    expect(result).toEqual({
      trainees: [
        {
          traineeName: 'trainee 1',
          company: 'alenvi',
          course: {
            name: 'programme de formation - des infos en plus',
            slots: ['slot', 'slot', 'slot'],
            trainer: 'Pere Castor',
            firstDate: '20/03/2020',
            lastDate: '21/04/2020',
            duration: '7h',
          },
        },
        {
          traineeName: 'trainee 2',
          company: 'alenvi',
          course: {
            name: 'programme de formation - des infos en plus',
            slots: ['slot', 'slot', 'slot'],
            trainer: 'Pere Castor',
            firstDate: '20/03/2020',
            lastDate: '21/04/2020',
            duration: '7h',
          },
        },
      ],
    });
    sinon.assert.calledWithExactly(formatIdentity.getCall(0), { lastname: 'MasterClass' }, 'FL');
    sinon.assert.calledWithExactly(formatIdentity.getCall(1), { lastname: 'trainee 1' }, 'FL');
    sinon.assert.calledWithExactly(formatIdentity.getCall(2), { lastname: 'trainee 2' }, 'FL');
    sinon.assert.calledOnceWithExactly(getCourseDuration, sortedSlots);
    sinon.assert.callCount(formatCourseSlotsForPdf, 3);
  });
});

describe('generateAttendanceSheets', () => {
  let CourseMock;
  let formatCourseForPdf;
  let generatePdf;
  beforeEach(() => {
    CourseMock = sinon.mock(Course);
    formatCourseForPdf = sinon.stub(CourseHelper, 'formatCourseForPdf');
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
  });
  afterEach(() => {
    CourseMock.restore();
    formatCourseForPdf.restore();
    generatePdf.restore();
  });

  it('should download attendance sheet', async () => {
    const courseId = new ObjectID();
    const course = { misc: 'des infos en plus' };
    CourseMock.expects('findOne')
      .withExactArgs({ _id: courseId })
      .chain('populate')
      .withExactArgs('company')
      .chain('populate')
      .withExactArgs('slots')
      .chain('populate')
      .withExactArgs({ path: 'trainees', populate: { path: 'company', select: 'name' } })
      .chain('populate')
      .withExactArgs('trainer')
      .chain('populate')
      .withExactArgs({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } })
      .chain('lean')
      .once()
      .returns(course);
    formatCourseForPdf.returns({ name: 'la formation - des infos en plus' });
    generatePdf.returns('pdf');

    await CourseHelper.generateAttendanceSheets(courseId);

    sinon.assert.calledOnceWithExactly(formatCourseForPdf, course);
    sinon.assert.calledOnceWithExactly(
      generatePdf,
      { name: 'la formation - des infos en plus' },
      './src/data/attendanceSheet.html'
    );
  });
});

describe('formatCourseForDocx', () => {
  let getCourseDuration;
  beforeEach(() => {
    getCourseDuration = sinon.stub(CourseHelper, 'getCourseDuration');
  });
  afterEach(() => {
    getCourseDuration.restore();
  });

  it('should format course for docx', () => {
    const course = {
      slots: [
        { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00' },
        { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00' },
        { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:30:00' },
      ],
      subProgram: { program: { learningGoals: 'Apprendre', name: 'nom du programme' } },
    };
    getCourseDuration.returns('7h');

    const result = CourseHelper.formatCourseForDocx(course);

    expect(result).toEqual({
      duration: '7h',
      learningGoals: course.subProgram.program.learningGoals,
      startDate: '20/03/2020',
      endDate: '21/04/2020',
      programName: 'NOM DU PROGRAMME',
    });
    sinon.assert.calledOnceWithExactly(
      getCourseDuration,
      [
        { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00' },
        { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00' },
        { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:30:00' },
      ]
    );
  });
});

describe('generateCompletionCertificate', () => {
  let CourseMock;
  let formatCourseForDocx;
  let formatIdentity;
  let createDocx;
  let generateZip;
  let momentFormat;
  let createReadStream;
  let downloadFileById;
  let tmpDir;
  beforeEach(() => {
    CourseMock = sinon.mock(Course);
    formatCourseForDocx = sinon.stub(CourseHelper, 'formatCourseForDocx');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    createDocx = sinon.stub(DocxHelper, 'createDocx');
    generateZip = sinon.stub(ZipHelper, 'generateZip');
    momentFormat = sinon.stub(momentProto, 'format').returns('20/01/2020');
    createReadStream = sinon.stub(fs, 'createReadStream');
    downloadFileById = sinon.stub(Drive, 'downloadFileById');
    tmpDir = sinon.stub(os, 'tmpdir').returns('/path');
  });
  afterEach(() => {
    CourseMock.restore();
    formatCourseForDocx.restore();
    formatIdentity.restore();
    createDocx.restore();
    generateZip.restore();
    momentFormat.restore();
    createReadStream.restore();
    downloadFileById.restore();
    tmpDir.restore();
  });

  it('should download completion certificates', async () => {
    const courseId = new ObjectID();
    const readable1 = new PassThrough();
    const readable2 = new PassThrough();
    const readable3 = new PassThrough();
    const course = {
      trainees: [
        { identity: { lastname: 'trainee 1' } },
        { identity: { lastname: 'trainee 2' } },
        { identity: { lastname: 'trainee 3' } },
      ],
      misc: 'Bonjour je suis une formation',
    };
    const formattedCourse = { program: { learningGoals: 'Apprendre', name: 'nom du programme' }, courseDuration: '8h' };
    CourseMock.expects('findOne')
      .withExactArgs({ _id: courseId })
      .chain('populate')
      .withExactArgs('slots')
      .chain('populate')
      .withExactArgs('trainees')
      .chain('populate')
      .withExactArgs({
        path: 'subProgram',
        select: 'program',
        populate: { path: 'program', select: 'name learningGoals' },
      })
      .chain('lean')
      .once()
      .returns(course);
    formatCourseForDocx.returns(formattedCourse);
    createDocx.onCall(0).returns('1.docx');
    createDocx.onCall(1).returns('2.docx');
    createDocx.onCall(2).returns('3.docx');
    momentFormat.returns('20/01/2020');
    formatIdentity.onCall(0).returns('trainee 1');
    formatIdentity.onCall(1).returns('trainee 2');
    formatIdentity.onCall(2).returns('trainee 3');
    createReadStream.onCall(0).returns(readable1);
    createReadStream.onCall(1).returns(readable2);
    createReadStream.onCall(2).returns(readable3);

    await CourseHelper.generateCompletionCertificates(courseId);

    sinon.assert.calledOnceWithExactly(formatCourseForDocx, course);
    sinon.assert.calledWithExactly(formatIdentity.getCall(0), { lastname: 'trainee 1' }, 'FL');
    sinon.assert.calledWithExactly(formatIdentity.getCall(1), { lastname: 'trainee 2' }, 'FL');
    sinon.assert.calledWithExactly(formatIdentity.getCall(2), { lastname: 'trainee 3' }, 'FL');
    sinon.assert.calledWithExactly(
      createDocx.getCall(0),
      '/path/certificate_template.docx',
      { ...formattedCourse, traineeIdentity: 'trainee 1', date: '20/01/2020' }
    );
    sinon.assert.calledWithExactly(
      createDocx.getCall(1),
      '/path/certificate_template.docx',
      { ...formattedCourse, traineeIdentity: 'trainee 2', date: '20/01/2020' }
    );
    sinon.assert.calledWithExactly(
      createDocx.getCall(2),
      '/path/certificate_template.docx',
      { ...formattedCourse, traineeIdentity: 'trainee 3', date: '20/01/2020' }
    );
    sinon.assert.calledOnceWithExactly(
      generateZip,
      'attestations.zip',
      [
        { name: 'Attestation - trainee 1.docx', file: readable1 },
        { name: 'Attestation - trainee 2.docx', file: readable2 },
        { name: 'Attestation - trainee 3.docx', file: readable3 },
      ]
    );
    sinon.assert.calledWithExactly(createReadStream.getCall(0), '1.docx');
    sinon.assert.calledWithExactly(createReadStream.getCall(1), '2.docx');
    sinon.assert.calledWithExactly(createReadStream.getCall(2), '3.docx');
    sinon.assert.calledOnceWithExactly(downloadFileById, {
      fileId: process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID,
      tmpFilePath: '/path/certificate_template.docx',
    });
    CourseMock.verify();
  });
});
