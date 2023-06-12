const sinon = require('sinon');
const get = require('lodash/get');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const SinonMongoose = require('../sinonMongoose');
const Attendance = require('../../../src/models/Attendance');
const Course = require('../../../src/models/Course');
const AttendanceHelper = require('../../../src/helpers/attendances');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');
const {
  BLENDED,
  INTRA,
  INTER_B2B,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ROLES,
  COURSE,
  TRAINEE,
  HOLDING_ADMIN,
} = require('../../../src/helpers/constants');
const CourseSlot = require('../../../src/models/CourseSlot');
const User = require('../../../src/models/User');

describe('create', () => {
  const credentials = { role: { vendor: { name: TRAINING_ORGANISATION_MANAGER } } };
  const isVendorUser = VENDOR_ROLES.includes(get(credentials, 'role.vendor.name'));

  let insertMany;
  let create;
  let courseSlotFindById;
  let find;
  let userFindOne;
  let getCompanyAtCourseRegistrationList;
  beforeEach(() => {
    insertMany = sinon.stub(Attendance, 'insertMany');
    create = sinon.stub(Attendance, 'create');
    courseSlotFindById = sinon.stub(CourseSlot, 'findById');
    find = sinon.stub(Attendance, 'find');
    userFindOne = sinon.stub(User, 'findOne');
    getCompanyAtCourseRegistrationList = sinon.stub(
      CourseHistoriesHelper,
      'getCompanyAtCourseRegistrationList'
    );
  });

  afterEach(() => {
    create.restore();
    insertMany.restore();
    courseSlotFindById.restore();
    find.restore();
    userFindOne.restore();
    getCompanyAtCourseRegistrationList.restore();
  });

  it('should add a single attendance on INTRA course', async () => {
    const company = new ObjectId();
    const payload = { trainee: new ObjectId(), courseSlot: new ObjectId() };
    const course = {
      _id: new ObjectId(),
      type: INTRA,
      trainees: [payload.trainee, new ObjectId(), new ObjectId()],
      companies: [company],
    };
    courseSlotFindById.returns(SinonMongoose.stubChainedQueries({ course }));
    getCompanyAtCourseRegistrationList.returns([{ trainee: payload.trainee, company }]);

    await AttendanceHelper.create(payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      courseSlotFindById,
      [
        { query: 'findById', args: [payload.courseSlot, { course: 1 }] },
        { query: 'populate', args: [{ path: 'course', select: 'type trainees companies' }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(create, { ...payload, company });
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: course._id },
      { key: TRAINEE, value: [payload.trainee] }
    );
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(insertMany);
    sinon.assert.notCalled(find);
  });

  it('should add a single attendance on INTER course. User is subscribed to course', async () => {
    const company = new ObjectId();
    const otherCompany = new ObjectId();
    const trainee = new ObjectId();
    const payload = { trainee, courseSlot: new ObjectId() };
    const course = {
      _id: new ObjectId(),
      type: INTER_B2B,
      trainees: [payload.trainee, new ObjectId(), new ObjectId()],
      companies: [otherCompany, company],
    };
    courseSlotFindById.returns(SinonMongoose.stubChainedQueries({ course }));
    getCompanyAtCourseRegistrationList.returns([{ trainee, company }]);

    await AttendanceHelper.create(payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      courseSlotFindById,
      [
        { query: 'findById', args: [payload.courseSlot, { course: 1 }] },
        { query: 'populate', args: [{ path: 'course', select: 'type trainees companies' }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(create, { ...payload, company });
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: course._id },
      { key: TRAINEE, value: [trainee] }
    );
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(insertMany);
    sinon.assert.notCalled(find);
  });

  it('should add a single attendance on INTER course. User is NOT subscribed to course', async () => {
    const company = new ObjectId();
    const otherCompany = new ObjectId();
    const payload = { trainee: new ObjectId(), courseSlot: new ObjectId() };
    const course = {
      _id: new ObjectId(),
      type: INTER_B2B,
      trainees: [new ObjectId(), new ObjectId(), new ObjectId()],
      companies: [otherCompany, company],
    };
    courseSlotFindById.returns(SinonMongoose.stubChainedQueries({ course }));
    userFindOne.returns(SinonMongoose.stubChainedQueries({ company }));
    getCompanyAtCourseRegistrationList.returns([]);

    await AttendanceHelper.create(payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      courseSlotFindById,
      [
        { query: 'findById', args: [payload.courseSlot, { course: 1 }] },
        { query: 'populate', args: [{ path: 'course', select: 'type trainees companies' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: payload.trainee }, { company: 1 }] },
        { query: 'populate', args: [{ path: 'company' }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(create, { ...payload, company });
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: course._id },
      { key: TRAINEE, value: [payload.trainee] }
    );
    sinon.assert.notCalled(insertMany);
    sinon.assert.notCalled(find);
  });

  it('should add several attendances for every trainee without attendance on INTRA course', async () => {
    const company = new ObjectId();
    const courseSlot = new ObjectId();
    const courseTrainees = [new ObjectId(), new ObjectId(), new ObjectId()];
    const payload = { courseSlot };
    const course = {
      _id: new ObjectId(),
      type: INTRA,
      trainees: [courseTrainees[0], courseTrainees[1], courseTrainees[2]],
      companies: [company],
    };

    courseSlotFindById.returns(SinonMongoose.stubChainedQueries({ course }));
    find.returns(
      SinonMongoose
        .stubChainedQueries([{ courseSlot, trainee: course.trainees[0]._id }], ['setOptions', 'lean'])
    );
    getCompanyAtCourseRegistrationList.returns([
      { trainee: courseTrainees[0], company },
      { trainee: courseTrainees[1], company },
      { trainee: courseTrainees[2], company },
    ]);

    await AttendanceHelper.create(payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      courseSlotFindById,
      [
        { query: 'findById', args: [courseSlot, { course: 1 }] },
        { query: 'populate', args: [{ path: 'course', select: 'type trainees companies' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ courseSlot, trainee: { $in: courseTrainees } }] },
        { query: 'setOptions', args: [{ isVendorUser }] },
        { query: 'lean' },
      ]

    );
    sinon.assert.calledOnceWithExactly(
      insertMany,
      [
        { courseSlot, trainee: course.trainees[1]._id, company },
        { courseSlot, trainee: course.trainees[2]._id, company },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: course._id },
      { key: TRAINEE, value: course.trainees }
    );
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(create);
  });

  it('should add several attendances for every trainee without attendance on INTER course', async () => {
    const courseSlot = new ObjectId();
    const companies = [new ObjectId(), new ObjectId(), new ObjectId()];
    const courseTrainees = [new ObjectId(), new ObjectId(), new ObjectId()];
    const payload = { courseSlot };
    const course = {
      _id: new ObjectId(),
      type: INTER_B2B,
      trainees: [courseTrainees[0], courseTrainees[1], courseTrainees[2]],
      companies,
    };

    courseSlotFindById.returns(SinonMongoose.stubChainedQueries({ course }));
    find.returns(
      SinonMongoose
        .stubChainedQueries([{ courseSlot, trainee: course.trainees[0]._id }], ['setOptions', 'lean'])
    );
    getCompanyAtCourseRegistrationList.returns([
      { trainee: courseTrainees[0], company: companies[0] },
      { trainee: courseTrainees[1], company: companies[1] },
      { trainee: courseTrainees[2], company: companies[2] },
    ]);

    await AttendanceHelper.create(payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      courseSlotFindById,
      [
        { query: 'findById', args: [courseSlot, { course: 1 }] },
        { query: 'populate', args: [{ path: 'course', select: 'type trainees companies' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ courseSlot, trainee: { $in: courseTrainees } }] },
        { query: 'setOptions', args: [{ isVendorUser }] },
        { query: 'lean' },
      ]

    );
    sinon.assert.calledOnceWithExactly(
      insertMany,
      [
        { courseSlot, trainee: course.trainees[1]._id, company: companies[1] },
        { courseSlot, trainee: course.trainees[2]._id, company: companies[2] },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: course._id },
      { key: TRAINEE, value: course.trainees }
    );
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(create);
  });
});

describe('list', () => {
  const credentials = { company: { _id: new ObjectId() }, role: { vendor: { name: TRAINING_ORGANISATION_MANAGER } } };
  const isVendorUser = VENDOR_ROLES.includes(get(credentials, 'role.vendor.name'));

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
      { trainee: new ObjectId(), courseSlot: courseSlots[0] },
      { trainee: new ObjectId(), courseSlot: courseSlots[1] },
    ];

    find.returns(SinonMongoose.stubChainedQueries(attendancesList, ['setOptions', 'lean']));

    const result = await AttendanceHelper.list([courseSlots], null, credentials);

    expect(result).toMatchObject(attendancesList);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ courseSlot: { $in: [courseSlots] } }] },
        { query: 'setOptions', args: [{ isVendorUser }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('listUnsubscribed', () => {
  const credentials = {
    company: { _id: new ObjectId() },
    role: { vendor: { name: TRAINING_ORGANISATION_MANAGER }, holding: { name: HOLDING_ADMIN } },
    holding: { companies: [new ObjectId(), new ObjectId()] },
  };
  const isVendorUser = VENDOR_ROLES.includes(get(credentials, 'role.vendor.name'));

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
                trainee: { _id: userId, identity: { lastname: 'Test', firstname: 'Marie' } },
                company: companyId,
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
                trainee: { _id: userId, identity: { lastname: 'Test', firstname: 'Marie' } },
                company: companyId,
              },
            ],
          },
        ],
      },
    ];

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));
    courseFind.returns(SinonMongoose.stubChainedQueries(courseWithSameSubProgramList));

    const result = await AttendanceHelper.listUnsubscribed(courseId, { company: companyId }, credentials);

    expect(result).toMatchObject({
      [userId]: [
        {
          trainee: { _id: userId, identity: { firstname: 'Marie', lastname: 'Test' } },
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
              ...([companyId].length && { match: { company: { $in: [companyId] } } }),
              select: 'trainee company',
              populate: { path: 'trainee', select: 'identity' },
              options: { isVendorUser },
            },
          }],
        },
        { query: 'populate', args: [{ path: 'trainer', select: 'identity' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return unexpected attendances grouped by trainee (with holding)', async () => {
    const courseId = new ObjectId();
    const holdingId = new ObjectId();
    const holdingCompanies = credentials.holding.companies;
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
                trainee: { _id: userId, identity: { lastname: 'Test', firstname: 'Marie' } },
                company: holdingCompanies[0],
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
                trainee: { _id: userId, identity: { lastname: 'Test', firstname: 'Marie' } },
                company: holdingCompanies[0],
              },
            ],
          },
        ],
      },
    ];

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));
    courseFind.returns(SinonMongoose.stubChainedQueries(courseWithSameSubProgramList));

    const result = await AttendanceHelper.listUnsubscribed(courseId, { holding: holdingId }, credentials);

    expect(result).toMatchObject({
      [userId]: [
        {
          trainee: { _id: userId, identity: { firstname: 'Marie', lastname: 'Test' } },
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
              ...(holdingCompanies.length && { match: { company: { $in: holdingCompanies } } }),
              select: 'trainee company',
              populate: { path: 'trainee', select: 'identity' },
              options: { isVendorUser },
            },
          }],
        },
        { query: 'populate', args: [{ path: 'trainer', select: 'identity' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return unexpected attendances grouped by trainee (without company and holding)', async () => {
    const courseId = new ObjectId();
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
                trainee: { _id: userId, identity: { lastname: 'Test', firstname: 'Marie' } },
                company: new ObjectId(),
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
                trainee: { _id: userId, identity: { lastname: 'Test', firstname: 'Marie' } },
                company: new ObjectId(),
              },
            ],
          },
        ],
      },
    ];

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));
    courseFind.returns(SinonMongoose.stubChainedQueries(courseWithSameSubProgramList));

    const result = await AttendanceHelper.listUnsubscribed(courseId, {}, credentials);

    expect(result).toMatchObject({
      [userId]: [
        {
          trainee: { _id: userId, identity: { firstname: 'Marie', lastname: 'Test' } },
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
              select: 'trainee company',
              populate: { path: 'trainee', select: 'identity' },
              options: { isVendorUser },
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
  const credentials = { company: { _id: new ObjectId() }, role: { vendor: { name: TRAINING_ORGANISATION_MANAGER } } };
  const isVendorUser = VENDOR_ROLES.includes(get(credentials, 'role.vendor.name'));

  let attendanceFind;
  let userFindOne;
  beforeEach(() => {
    attendanceFind = sinon.stub(Attendance, 'find');
    userFindOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    attendanceFind.restore();
    userFindOne.restore();
  });

  it('should return trainee\'s unsubscribed attendances', async () => {
    const traineeId = new ObjectId();
    const trainee = { _id: traineeId, company: new ObjectId() };
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

    userFindOne.returns(SinonMongoose.stubChainedQueries(trainee));
    attendanceFind.returns(SinonMongoose.stubChainedQueries(attendances, ['populate', 'setOptions', 'lean']));

    const result = await AttendanceHelper.getTraineeUnsubscribedAttendances(traineeId, credentials);

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
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: traineeId }, { company: 1 }] },
        { query: 'populate', args: [{ path: 'company' }] },
        { query: 'lean' },
      ]
    );

    SinonMongoose.calledOnceWithExactly(
      attendanceFind,
      [
        { query: 'find', args: [{ trainee: traineeId, company: trainee.company }] },
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
        { query: 'setOptions', args: [{ isVendorUser }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('delete', () => {
  let deleteOne;
  let courseSlotFindById;
  let deleteMany;
  beforeEach(() => {
    deleteOne = sinon.stub(Attendance, 'deleteOne');
    courseSlotFindById = sinon.stub(CourseSlot, 'findById');
    deleteMany = sinon.stub(Attendance, 'deleteMany');
  });
  afterEach(() => {
    deleteOne.restore();
    courseSlotFindById.restore();
    deleteMany.restore();
  });

  it('should remove an attendance', async () => {
    const query = { courseSlot: new ObjectId(), trainee: new ObjectId() };

    await AttendanceHelper.delete(query);

    sinon.assert.calledOnceWithExactly(deleteOne, query);
    sinon.assert.notCalled(courseSlotFindById);
    sinon.assert.notCalled(deleteMany);
  });

  it('should remove all attendances for a courseSlot', async () => {
    const courseSlot = new ObjectId();
    const trainees = [new ObjectId(), new ObjectId(), new ObjectId()];
    courseSlotFindById.returns(SinonMongoose.stubChainedQueries({ course: { trainees } }));

    await AttendanceHelper.delete({ courseSlot });

    sinon.assert.notCalled(deleteOne);
    SinonMongoose.calledOnceWithExactly(
      courseSlotFindById,
      [
        { query: 'findById', args: [courseSlot, { course: 1 }] },
        { query: 'populate', args: [{ path: 'course', select: 'trainees' }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(deleteMany, { courseSlot, trainee: { $in: trainees } });
  });
});
