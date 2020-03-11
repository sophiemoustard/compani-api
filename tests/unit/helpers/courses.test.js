const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Course = require('../../../src/models/Course');
const CourseHelper = require('../../../src/helpers/courses');
require('sinon-mongoose');

describe('createCourse', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(Course.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should create a program', async () => {
    const newCourse = { name: 'name', companies: [new ObjectID()], program: new ObjectID(), type: 'intra' };

    const result = await CourseHelper.createCourse(newCourse);
    expect(result).toMatchObject(newCourse);
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
    const program = { _id: new ObjectID() };

    CourseMock.expects('findOne')
      .withExactArgs({ _id: program._id })
      .chain('lean')
      .once()
      .returns(program);

    const result = await CourseHelper.getCourse(program._id);
    expect(result).toMatchObject(program);
  });
});
