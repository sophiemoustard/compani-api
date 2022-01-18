const sinon = require('sinon');
const get = require('lodash/get');
const expect = require('expect');
const { ObjectId } = require('mongodb');
const Attendance = require('../../../src/models/Attendance');
const Course = require('../../../src/models/Course');
const AttendanceHelper = require('../../../src/helpers/attendances');
const SinonMongoose = require('../sinonMongoose');
const { BLENDED } = require('../../../src/helpers/constants');

describe('create', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(Attendance.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should add an attendance', async () => {
    const newAttendance = { trainee: new ObjectId(), courseSlot: new ObjectId() };
    const result = await AttendanceHelper.create(newAttendance);

    expect(result).toMatchObject(newAttendance);
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Attendance, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return courseSlots\' attendances', async () => {
    const courseSlots = [new ObjectId(), new ObjectId()];
    const attendancesList = [
      { trainee: { _id: new ObjectId(), company: new ObjectId() }, courseSlot: courseSlots[0] },
      { trainee: { _id: new ObjectId(), company: new ObjectId() }, courseSlot: courseSlots[1] },
    ];

    find.returns(SinonMongoose.stubChainedQueries([attendancesList]));

    const result = await AttendanceHelper.list([courseSlots], null);

    expect(result).toMatchObject(attendancesList);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ courseSlot: { $in: [courseSlots] } }] },
        { query: 'populate', args: [{ path: 'trainee', select: 'company', populate: { path: 'company' } }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return all courseSlots attendances for a company', async () => {
    const companyId = new ObjectId();
    const otherCompanyId = new ObjectId();
    const courseSlots = [new ObjectId(), new ObjectId()];
    const attendancesList = [
      { trainee: { _id: new ObjectId(), company: companyId }, courseSlot: courseSlots[0] },
      { trainee: { _id: new ObjectId(), company: otherCompanyId }, courseSlot: courseSlots[1] },
    ];

    find.returns(SinonMongoose.stubChainedQueries([attendancesList]));

    const result = await AttendanceHelper.list([courseSlots], companyId);

    expect(result).toMatchObject([attendancesList[0]]);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ courseSlot: { $in: [courseSlots] } }] },
        { query: 'populate', args: [{ path: 'trainee', select: 'company', populate: { path: 'company' } }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('listUnsubscribed', () => {
  let courseFindOne;
  let courseFind;
  beforeEach(() => {
    courseFindOne = sinon.stub(Course, 'findOne');
    courseFind = sinon.stub(Course, 'find');
  });
  afterEach(() => {
    courseFindOne.restore();
    courseFind.restore();
  });

  it('should return unexpected attendances grouped by trainee (with company)', async () => {
    const courseId = new ObjectId();
    const companyId = new ObjectId();
    const subProgramId = new ObjectId();
    const userId = new ObjectId();
    const course = {
      _id: new ObjectId(),
      subProgram: { _id: subProgramId, program: { _id: new ObjectId(), subPrograms: [subProgramId] } },
      trainees: [userId],
    };
    const courseWithSameSubProgramList = [
      {
        _id: new ObjectId(),
        format: 'blended',
        trainees: [userId],
        misc: 'group 4',
        type: 'inter b2b',
        subProgram: subProgramId,
        trainer: { _id: new ObjectId(), identity: { lastname: 'Trainer', firstname: 'Jean' } },
        slots: [
          {
            endDate: new Date('2020-11-18T15:00:00.000Z'),
            startDate: new Date('2020-11-18T13:00:00.000Z'),
            step: { _id: new ObjectId(), name: 'step' },
            attendances: [
              {
                _id: new ObjectId(),
                trainee: { _id: userId, company: companyId, identity: { lastname: 'Test', firstname: 'Marie' } },
              },
            ],
          },
        ],
      },
      {
        _id: course._id,
        format: 'blended',
        trainees: [],
        misc: 'group 1',
        type: 'inter_b2b',
        subProgram: subProgramId,
        trainer: { _id: new ObjectId(), identity: { lastname: 'Trainer', firstname: 'Paul' } },
        slots: [
          {
            endDate: new Date('2020-11-20T15:00:00.000Z'),
            startDate: new Date('2020-11-20T13:00:00.000Z'),
            step: { _id: new ObjectId(), name: 'step 2' },
            attendances: [
              {
                _id: new ObjectId(),
                trainee: { _id: userId, company: companyId, identity: { lastname: 'Test', firstname: 'Marie' } },
              },
            ],
          },
        ],
      },
    ];

    courseFindOne.returns(SinonMongoose.stubChainedQueries([course]));
    courseFind.returns(SinonMongoose.stubChainedQueries([courseWithSameSubProgramList]));

    const result = await AttendanceHelper.listUnsubscribed(courseId, companyId);

    expect(result).toMatchObject({
      [userId]: [
        {
          trainee: { _id: userId, identity: { firstname: 'Marie', lastname: 'Test' }, company: companyId },
          trainer: { identity: { firstname: 'Paul', lastname: 'Trainer' } },
          misc: 'group 1',
          courseSlot: {
            endDate: new Date('2020-11-20T15:00:00.000Z'),
            startDate: new Date('2020-11-20T13:00:00.000Z'),
            step: { name: 'step 2' },
          },
        },
      ],
    });

    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        {
          query: 'populate',
          args: [{ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'subPrograms' } }],
        },
        { query: 'lean' },
      ]
    );

    SinonMongoose.calledOnceWithExactly(
      courseFind,
      [
        {
          query: 'find',
          args: [{ format: BLENDED, subProgram: { $in: get(course, 'subProgram.program.subPrograms') } }],
        },
        {
          query: 'populate',
          args: [{
            path: 'slots',
            select: 'attendances step startDate endDate',
            populate: [
              {
                path: 'attendances',
                select: 'trainee',
                populate: { path: 'trainee', select: 'identity company', populate: 'company' },
              },
              { path: 'step', select: 'name' },
            ],
          }],
        },
        { query: 'populate', args: [{ path: 'trainer', select: 'identity' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return unexpected attendances grouped by trainee (without company)', async () => {
    const courseId = new ObjectId();
    const subProgramId = new ObjectId();
    const userId = new ObjectId();
    const userCompanyId = new ObjectId();
    const course = {
      _id: new ObjectId(),
      subProgram: { _id: subProgramId, program: { _id: new ObjectId(), subPrograms: [subProgramId] } },
      trainees: [userId],
    };
    const courseWithSameSubProgramList = [
      {
        _id: new ObjectId(),
        format: 'blended',
        trainees: [userId],
        misc: 'group 4',
        type: 'inter b2b',
        subProgram: subProgramId,
        trainer: { _id: new ObjectId(), identity: { lastname: 'Trainer', firstname: 'Jean' } },
        slots: [
          {
            endDate: new Date('2020-11-18T15:00:00.000Z'),
            startDate: new Date('2020-11-18T13:00:00.000Z'),
            step: { _id: new ObjectId(), name: 'step' },
            attendances: [
              {
                _id: new ObjectId(),
                trainee: { _id: userId, company: userCompanyId, identity: { lastname: 'Test', firstname: 'Marie' } },
              },
            ],
          },
        ],
      },
      {
        _id: course._id,
        format: 'blended',
        trainees: [],
        misc: 'group 1',
        type: 'inter_b2b',
        subProgram: subProgramId,
        trainer: { _id: new ObjectId(), identity: { lastname: 'Trainer', firstname: 'Paul' } },
        slots: [
          {
            endDate: new Date('2020-11-20T15:00:00.000Z'),
            startDate: new Date('2020-11-20T13:00:00.000Z'),
            step: { _id: new ObjectId(), name: 'step 2' },
            attendances: [
              {
                _id: new ObjectId(),
                trainee: { _id: userId, company: userCompanyId, identity: { lastname: 'Test', firstname: 'Marie' } },
              },
            ],
          },
        ],
      },
    ];

    courseFindOne.returns(SinonMongoose.stubChainedQueries([course]));
    courseFind.returns(SinonMongoose.stubChainedQueries([courseWithSameSubProgramList]));

    const result = await AttendanceHelper.listUnsubscribed(courseId);

    expect(result).toMatchObject({
      [userId]: [
        {
          trainee: { _id: userId, identity: { firstname: 'Marie', lastname: 'Test' }, company: userCompanyId },
          trainer: { identity: { firstname: 'Paul', lastname: 'Trainer' } },
          misc: 'group 1',
          courseSlot: {
            endDate: new Date('2020-11-20T15:00:00.000Z'),
            startDate: new Date('2020-11-20T13:00:00.000Z'),
            step: { name: 'step 2' },
          },
        },
      ],
    });

    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        {
          query: 'populate',
          args: [{ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'subPrograms' } }],
        },
        { query: 'lean' },
      ]
    );

    SinonMongoose.calledOnceWithExactly(
      courseFind,
      [
        {
          query: 'find',
          args: [{ format: BLENDED, subProgram: { $in: get(course, 'subProgram.program.subPrograms') } }],
        },
        {
          query: 'populate',
          args: [{
            path: 'slots',
            select: 'attendances step startDate endDate',
            populate: [
              {
                path: 'attendances',
                select: 'trainee',
                populate: { path: 'trainee', select: 'identity company', populate: 'company' },
              },
              { path: 'step', select: 'name' },
            ],
          }],
        },
        { query: 'populate', args: [{ path: 'trainer', select: 'identity' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('delete', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(Attendance, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should remove a category', async () => {
    const attendanceId = new ObjectId();
    await AttendanceHelper.delete(attendanceId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: attendanceId });
  });
});
