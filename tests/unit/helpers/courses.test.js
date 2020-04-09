const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const User = require('../../../src/models/User');
const Role = require('../../../src/models/Role');
const CourseHelper = require('../../../src/helpers/courses');
const TwilioHelper = require('../../../src/helpers/twilio');
const UsersHelper = require('../../../src/helpers/users');
const { AUXILIARY } = require('../../../src/helpers/constants');
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
    const newCourse = { name: 'name', companies: [new ObjectID()], program: new ObjectID(), type: 'intra' };

    const result = await CourseHelper.createCourse(newCourse);
    expect(result.name).toEqual(newCourse.name);
    expect(result.program).toEqual(newCourse.program);
    expect(result.companies[0]).toEqual(newCourse.companies[0]);
  });
});

describe('list', () => {
  let CourseMock;
  beforeEach(() => {
    CourseMock = sinon.mock(Course);
  });
  afterEach(() => {
    CourseMock.restore();
  });

  it('should return courses', async () => {
    const coursesList = [{ name: 'name' }, { name: 'program' }];

    CourseMock.expects('find')
      .withExactArgs({ type: 'toto' })
      .chain('lean')
      .once()
      .returns(coursesList);

    const result = await CourseHelper.list({ type: 'toto' });
    expect(result).toMatchObject(coursesList);
  });
});

describe('getCourse', () => {
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
      .withExactArgs('companies')
      .chain('populate')
      .withExactArgs('program')
      .chain('populate')
      .withExactArgs('slots')
      .chain('populate')
      .withExactArgs('trainees')
      .chain('lean')
      .once()
      .returns(course);

    const result = await CourseHelper.getCourse(course._id);
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
    const payload = { name: 'name' };
    CourseMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: courseId }, { $set: payload })
      .chain('lean')
      .returns(payload);

    const result = await CourseHelper.updateCourse(courseId, payload);
    expect(result.name).toEqual(payload.name);
  });
});

describe('sendSMS', () => {
  const courseId = new ObjectID();
  const traineesId = [new ObjectID(), new ObjectID()];
  const trainees = [
    { contact: { phone: '0123456789' }, identity: { firstname: 'non', lasname: 'ok' } },
    { contact: { phone: '0987654321' }, identity: { firstname: 'test', lasname: 'ok' } },
  ];
  const payload = { body: 'Ceci est un test.' };

  let CourseMock;
  let UserMock;
  let sendStub;
  beforeEach(() => {
    CourseMock = sinon.mock(Course);
    UserMock = sinon.mock(User);
    sendStub = sinon.stub(TwilioHelper, 'send');
  });
  afterEach(() => {
    CourseMock.restore();
    UserMock.restore();
    sendStub.restore();
  });

  it('should sens SMS to trainees', async () => {
    CourseMock.expects('findById')
      .withExactArgs(courseId)
      .chain('lean')
      .returns({ trainees: traineesId });

    UserMock.expects('find')
      .withExactArgs({ _id: { $in: traineesId } })
      .chain('lean')
      .returns(trainees);

    sendStub.returns();

    await CourseHelper.sendSMS(courseId, payload);

    sinon.assert.calledWith(
      sendStub.getCall(0),
      { to: `+33${trainees[0].contact.phone.substring(1)}`, from: 'Compani', body: payload.body }
    );
    sinon.assert.calledWithExactly(
      sendStub.getCall(1),
      { to: `+33${trainees[1].contact.phone.substring(1)}`, from: 'Compani', body: payload.body }
    );
    CourseMock.verify();
    UserMock.verify();
  });
});

describe('addCourseTrainee', () => {
  let CourseMock;
  let RoleMock;
  let createUserStub;
  beforeEach(() => {
    CourseMock = sinon.mock(Course, 'CourseMock');
    RoleMock = sinon.mock(Role, 'RoleMock');
    createUserStub = sinon.stub(UsersHelper, 'createUser');
  });
  afterEach(() => {
    CourseMock.restore();
    RoleMock.restore();
    createUserStub.restore();
  });

  it('should add a course trainee using existing user', async () => {
    const user = { _id: new ObjectID() };
    const course = { _id: new ObjectID(), name: 'Test' };
    const payload = { local: { email: 'toto@toto.com' } };

    RoleMock.expects('findOne').never();
    CourseMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: course._id }, { $addToSet: { trainees: user._id } }, { new: true })
      .chain('lean')
      .returns({ ...course, trainee: [user._id] });

    const result = await CourseHelper.addCourseTrainee(course._id, payload, user);
    expect(result.trainee).toEqual(expect.arrayContaining([user._id]));
    CourseMock.verify();
    RoleMock.verify();
    sinon.assert.notCalled(createUserStub);
  });

  it('should add a course trainee creating new user', async () => {
    const user = { _id: new ObjectID() };
    const course = { _id: new ObjectID(), name: 'Test' };
    const payload = { local: { email: 'toto@toto.com' } };
    const role = { _id: new ObjectID() };

    RoleMock.expects('findOne').withExactArgs({ name: AUXILIARY }, { _id: 1 }).chain('lean').returns(role);
    createUserStub.returns(user);
    CourseMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: course._id }, { $addToSet: { trainees: user._id } }, { new: true })
      .chain('lean')
      .returns({ ...course, trainee: [user._id] });

    const result = await CourseHelper.addCourseTrainee(course._id, payload, null);
    expect(result.trainee).toEqual(expect.arrayContaining([user._id]));
    CourseMock.verify();
    RoleMock.verify();
    sinon.assert.calledWithExactly(createUserStub, { ...payload, role: role._id });
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

