const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const User = require('../../../src/models/User');
const Role = require('../../../src/models/Role');
const CourseHelper = require('../../../src/helpers/courses');
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

describe('addCourseTrainee', () => {
  let CourseMock;
  let UserMock;
  let RoleMock;
  let createUserStub;
  beforeEach(() => {
    CourseMock = sinon.mock(Course, 'CourseMock');
    UserMock = sinon.mock(User, 'UserMock');
    RoleMock = sinon.mock(Role, 'RoleMock');
    createUserStub = sinon.stub(UsersHelper, 'createUser');
  });
  afterEach(() => {
    CourseMock.restore();
    UserMock.restore();
    RoleMock.restore();
    createUserStub.restore();
  });

  it('should add a course trainee using existing user', async () => {
    const user = { _id: new ObjectID() };
    const course = { _id: new ObjectID(), name: 'Test' };
    const payload = { local: { email: 'toto@toto.com' } };

    UserMock.expects('findOne').withExactArgs({ 'local.email': payload.local.email }).chain('lean').returns(user);
    RoleMock.expects('findOne').never();
    CourseMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: course._id }, { $addToSet: { trainees: user._id } }, { new: true })
      .chain('lean')
      .returns({ ...course, trainee: [user._id] });

    const result = await CourseHelper.addCourseTrainee(course._id, payload);
    expect(result.trainee).toEqual(expect.arrayContaining([user._id]));
    CourseMock.verify();
    sinon.assert.notCalled(createUserStub);
  });

  it('should add a course trainee creating new user', async () => {
    const user = { _id: new ObjectID() };
    const course = { _id: new ObjectID(), name: 'Test' };
    const payload = { local: { email: 'toto@toto.com' } };
    const role = { _id: new ObjectID() };

    UserMock.expects('findOne').withExactArgs({ 'local.email': payload.local.email }).chain('lean').returns(null);
    RoleMock.expects('findOne').withExactArgs({ name: AUXILIARY }, { _id: 1 }).chain('lean').returns(role);
    createUserStub.returns(user);
    CourseMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: course._id }, { $addToSet: { trainees: user._id } }, { new: true })
      .chain('lean')
      .returns({ ...course, trainee: [user._id] });

    const result = await CourseHelper.addCourseTrainee(course._id, payload);
    expect(result.trainee).toEqual(expect.arrayContaining([user._id]));
    CourseMock.verify();
    sinon.assert.calledWithExactly(createUserStub, { ...payload, role: role._id });
  });
});
