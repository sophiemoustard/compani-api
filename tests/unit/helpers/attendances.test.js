const sinon = require('sinon');
const get = require('lodash/get');
const expect = require('expect');
const { ObjectId } = require('mongodb');
const Attendance = require('../../../src/models/Attendance');
const Course = require('../../../src/models/Course');
const AttendanceHelper = require('../../../src/helpers/attendances');
const SinonMongoose = require('../sinonMongoose');
const { BLENDED } = require('../../../src/helpers/constants');
const CourseSlot = require('../../../src/models/CourseSlot');

describe('create #tag', () => {
  let create;
  let courseSlotFindById;
  let courseFindById;
  let attendanceFind;
  beforeEach(() => {
    create = sinon.stub(Attendance, 'create');
    courseSlotFindById = sinon.stub(CourseSlot, 'findById');
    courseFindById = sinon.stub(Course, 'findById');
    attendanceFind = sinon.stub(Attendance, 'find');
  });
  afterEach(() => {
    create.restore();
    courseSlotFindById.restore();
    courseFindById.restore();
    attendanceFind.restore();
  });

  it('should add an attendance', async () => {
    const payload = { trainee: new ObjectId(), courseSlot: new ObjectId() };
    await AttendanceHelper.create(payload);

    sinon.assert.calledOnceWithExactly(create, payload);
  });

  it('should add an attendance for every trainee without attendance', async () => {
    const courseSlot = new ObjectId();
    const payload = { courseSlot };
    const course = new ObjectId();
    const trainees = [new ObjectId(), new ObjectId(), new ObjectId()];

    courseSlotFindById.returns({ course });
    courseFindById.returns({ trainees });
    attendanceFind.returns([{ courseSlot, trainee: trainees[0] }]);

    await AttendanceHelper.create(payload);

    sinon.assert.calledOnceWithExactly(courseSlotFindById, courseSlot);
    sinon.assert.calledOnceWithExactly(courseFindById, course);
    sinon.assert.calledOnceWithExactly(attendanceFind, { courseSlot, trainee: { $in: trainees } });
    sinon.assert.calledWithExactly(create, { courseSlot, trainee: trainees[1] });
    sinon.assert.calledWithExactly(create, { courseSlot, trainee: trainees[2] });
    sinon.assert.calledTwice(create);
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

    find.returns(SinonMongoose.stubChainedQueries(attendancesList));

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

    find.returns(SinonMongoose.stubChainedQueries(attendancesList));

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

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));
    courseFind.returns(SinonMongoose.stubChainedQueries(courseWithSameSubProgramList));

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
            select: 'attendances startDate endDate',
            populate: {
              path: 'attendances',
              select: 'trainee',
              populate: { path: 'trainee', select: 'identity company', populate: 'company' },
            },
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

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));
    courseFind.returns(SinonMongoose.stubChainedQueries(courseWithSameSubProgramList));

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
            select: 'attendances startDate endDate',
            populate: {
              path: 'attendances',
              select: 'trainee',
              populate: { path: 'trainee', select: 'identity company', populate: 'company' },
            },
          }],
        },
        { query: 'populate', args: [{ path: 'trainer', select: 'identity' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('getTraineeUnsubscribedAttendances', () => {
  let attendanceFind;
  beforeEach(() => {
    attendanceFind = sinon.stub(Attendance, 'find');
  });
  afterEach(() => {
    attendanceFind.restore();
  });

  it('should return trainee\'s unsubscribed attendances', async () => {
    const traineeId = new ObjectId();
    const programAId = new ObjectId();
    const programBId = new ObjectId();
    const attendances = [
      {
        _id: new ObjectId(),
        trainee: traineeId,
        courseSlot: {
          _id: new ObjectId(),
          course: null,
          endDate: '2021-12-20T11:30:00.000Z',
          startDate: '2021-12-20T08:00:00.000Z',
        },
      },
      {
        _id: new ObjectId(),
        trainee: traineeId,
        courseSlot: {
          _id: new ObjectId(),
          course: {
            trainer: { _id: new ObjectId(), identity: { firstname: 'Zinedine', lastname: 'Zidane' } },
            misc: 'équipe 1',
            subProgram: { _id: ObjectId(), program: { _id: programAId, name: '1000 pompes' } },
          },
          endDate: '2021-11-10T11:30:00.000Z',
          startDate: '2021-11-10T08:00:00.000Z',
        },
      },
      {
        _id: new ObjectId(),
        trainee: traineeId,
        courseSlot: {
          _id: new ObjectId(),
          course: {
            trainer: { _id: new ObjectId(), identity: { firstname: 'Zinedine', lastname: 'Zidane' } },
            misc: 'équipe 1',
            subProgram: { _id: ObjectId(), program: { _id: programAId, name: '1000 pompes' } },
          },
          endDate: '2021-12-24T11:30:00.000Z',
          startDate: '2021-12-24T08:00:00.000Z',
        },
      },
      {
        _id: new ObjectId(),
        trainee: traineeId,
        courseSlot: {
          _id: new ObjectId(),
          course: {
            trainer: { _id: new ObjectId(), identity: { firstname: 'Didier', lastname: 'Deschamps' } },
            misc: 'équipe 2',
            subProgram: { _id: ObjectId(), program: { _id: programBId, name: '2 tractions' } },
          },
          endDate: '2022-01-27T11:30:00.000Z',
          startDate: '2022-01-27T08:00:00.000Z',
        },
      },
    ];

    attendanceFind.returns(SinonMongoose.stubChainedQueries(attendances));

    const result = await AttendanceHelper.getTraineeUnsubscribedAttendances(traineeId);

    expect(result).toMatchObject({
      [programAId]: [
        {
          courseSlot: {
            endDate: '2021-11-10T11:30:00.000Z',
            startDate: '2021-11-10T08:00:00.000Z',
          },
          course: {
            trainer: { identity: { firstname: 'Zinedine', lastname: 'Zidane' } },
            misc: 'équipe 1',
          },
          program: { _id: programAId, name: '1000 pompes' },
        },
        {
          courseSlot: {
            endDate: '2021-12-24T11:30:00.000Z',
            startDate: '2021-12-24T08:00:00.000Z',
          },
          course: {
            trainer: { identity: { firstname: 'Zinedine', lastname: 'Zidane' } },
            misc: 'équipe 1',
          },
          program: { _id: programAId, name: '1000 pompes' },
        },
      ],
      [programBId]: [
        {
          courseSlot: {
            endDate: '2022-01-27T11:30:00.000Z',
            startDate: '2022-01-27T08:00:00.000Z',
          },
          course: {
            trainer: { identity: { firstname: 'Didier', lastname: 'Deschamps' } },
            misc: 'équipe 2',
          },
          program: { _id: programBId, name: '2 tractions' },
        },
      ],
    });

    SinonMongoose.calledOnceWithExactly(
      attendanceFind,
      [
        { query: 'find', args: [{ trainee: traineeId }] },
        {
          query: 'populate',
          args: [{
            path: 'courseSlot',
            select: 'course startDate endDate',
            populate: [
              {
                path: 'course',
                match: { trainees: { $ne: traineeId } },
                select: 'trainer misc subProgram',
                populate: [
                  { path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } },
                  { path: 'trainer', select: 'identity' },
                ],
              },
            ],
          }],
        },
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
