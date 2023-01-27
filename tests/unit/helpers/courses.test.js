const sinon = require('sinon');
const omit = require('lodash/omit');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const os = require('os');
const { PassThrough } = require('stream');
const Boom = require('@hapi/boom');
const { get } = require('lodash');
const UtilsMock = require('../../utilsMock');
const Course = require('../../../src/models/Course');
const CourseBill = require('../../../src/models/CourseBill');
const SubProgram = require('../../../src/models/SubProgram');
const Attendance = require('../../../src/models/Attendance');
const User = require('../../../src/models/User');
const CourseHistory = require('../../../src/models/CourseHistory');
const CourseSlot = require('../../../src/models/CourseSlot');
const CourseSmsHistory = require('../../../src/models/CourseSmsHistory');
const Drive = require('../../../src/models/Google/Drive');
const Questionnaire = require('../../../src/models/Questionnaire');
const CourseHelper = require('../../../src/helpers/courses');
const SmsHelper = require('../../../src/helpers/sms');
const UtilsHelper = require('../../../src/helpers/utils');
const PdfHelper = require('../../../src/helpers/pdf');
const ZipHelper = require('../../../src/helpers/zip');
const DocxHelper = require('../../../src/helpers/docx');
const StepHelper = require('../../../src/helpers/steps');
const NotificationHelper = require('../../../src/helpers/notifications');
const {
  COURSE_SMS,
  BLENDED,
  DRAFT,
  E_LEARNING,
  STRICTLY_E_LEARNING,
  ON_SITE,
  MOBILE,
  REMOTE,
  INTRA,
  INTER_B2B,
  OPERATIONS,
  PEDAGOGY,
  WEBAPP,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  VENDOR_ROLES,
  INTER_B2C,
} = require('../../../src/helpers/constants');
const CourseRepository = require('../../../src/repositories/CourseRepository');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');
const SinonMongoose = require('../sinonMongoose');
const InterAttendanceSheet = require('../../../src/data/pdf/attendanceSheet/interAttendanceSheet');
const IntraAttendanceSheet = require('../../../src/data/pdf/attendanceSheet/intraAttendanceSheet');
const CourseConvocation = require('../../../src/data/pdf/courseConvocation');
const CompletionCertificate = require('../../../src/data/pdf/completionCertificate');

describe('createCourse', () => {
  let create;
  let findOneSubProgram;
  let createHistoryOnEstimatedStartDateEdition;
  let insertManyCourseSlot;
  const credentials = { _id: new ObjectId() };

  beforeEach(() => {
    create = sinon.stub(Course, 'create');
    findOneSubProgram = sinon.stub(SubProgram, 'findOne');
    createHistoryOnEstimatedStartDateEdition = sinon.stub(
      CourseHistoriesHelper,
      'createHistoryOnEstimatedStartDateEdition'
    );
    insertManyCourseSlot = sinon.stub(CourseSlot, 'insertMany');
  });
  afterEach(() => {
    create.restore();
    findOneSubProgram.restore();
    createHistoryOnEstimatedStartDateEdition.restore();
    insertManyCourseSlot.restore();
  });

  it('should create an intra course', async () => {
    const steps = [
      { _id: new ObjectId(), type: ON_SITE },
      { _id: new ObjectId(), type: REMOTE },
      { _id: new ObjectId(), type: E_LEARNING },
    ];
    const subProgram = { _id: new ObjectId(), steps };
    const payload = {
      misc: 'name',
      company: new ObjectId(),
      subProgram: subProgram._id,
      type: INTRA,
      maxTrainees: 12,
      salesRepresentative: new ObjectId(),
    };

    findOneSubProgram.returns(SinonMongoose.stubChainedQueries(subProgram));
    create.returns({ ...omit(payload, 'company'), companies: [payload.company], format: 'blended' });

    const result = await CourseHelper.createCourse(payload, credentials);

    const slots = [{ course: result._id, step: steps[0]._id }, { course: result._id, step: steps[1]._id }];

    expect(result.misc).toEqual('name');
    expect(result.subProgram).toEqual(payload.subProgram);
    expect(result.companies).toContain(payload.company);
    expect(result.format).toEqual('blended');
    expect(result.type).toEqual(INTRA);
    expect(result.salesRepresentative).toEqual(payload.salesRepresentative);
    sinon.assert.notCalled(createHistoryOnEstimatedStartDateEdition);
    sinon.assert.calledOnceWithExactly(create, { ...omit(payload, 'company'), companies: [payload.company] });
    sinon.assert.calledOnceWithExactly(insertManyCourseSlot, slots);
    SinonMongoose.calledOnceWithExactly(
      findOneSubProgram,
      [
        { query: 'findOne', args: [{ _id: subProgram._id }, { steps: 1 }] },
        { query: 'populate', args: [{ path: 'steps', select: '_id type' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should create an inter course without steps', async () => {
    const subProgram = { _id: new ObjectId(), steps: [] };
    const payload = {
      misc: 'name',
      subProgram: subProgram._id,
      type: INTER_B2B,
      salesRepresentative: new ObjectId(),
    };

    findOneSubProgram.returns(SinonMongoose.stubChainedQueries(subProgram));
    create.returns({ ...payload, format: 'blended', companies: [] });

    const result = await CourseHelper.createCourse(payload, credentials);

    expect(result.misc).toEqual('name');
    expect(result.subProgram).toEqual(payload.subProgram);
    expect(result.format).toEqual('blended');
    expect(result.type).toEqual(INTER_B2B);
    expect(result.salesRepresentative).toEqual(payload.salesRepresentative);
    sinon.assert.notCalled(createHistoryOnEstimatedStartDateEdition);
    sinon.assert.calledOnceWithExactly(create, payload);
    sinon.assert.notCalled(insertManyCourseSlot);
    SinonMongoose.calledOnceWithExactly(
      findOneSubProgram,
      [
        { query: 'findOne', args: [{ _id: subProgram._id }, { steps: 1 }] },
        { query: 'populate', args: [{ path: 'steps', select: '_id type' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should call CourseHistoryHelper for history save when creating a course with estimatedStartDate', async () => {
    const subProgram = { _id: new ObjectId(), steps: [] };
    const payload = {
      misc: 'avec une date de début prévu',
      company: new ObjectId(),
      subProgram: subProgram._id,
      type: INTRA,
      salesRepresentative: new ObjectId(),
      estimatedStartDate: '2022-12-10T12:00:00.000Z',
    };
    const createdCourse = { ...payload, _id: new ObjectId(), format: 'blended', companies: [] };

    findOneSubProgram.returns(SinonMongoose.stubChainedQueries(subProgram));
    create.returns(createdCourse);

    await CourseHelper.createCourse(payload, credentials);

    sinon.assert.calledOnceWithExactly(
      createHistoryOnEstimatedStartDateEdition,
      createdCourse._id,
      credentials._id,
      '2022-12-10T12:00:00.000Z'
    );
  });
});

describe('getTotalTheoreticalDuration', () => {
  it('should return theoreticalDuration sum', async () => {
    const course = {
      subProgram: {
        steps: [
          { _id: new ObjectId(), theoreticalDuration: 'PT504S' },
          { _id: new ObjectId() },
          { _id: new ObjectId(), theoreticalDuration: 'PT0S' },
          { _id: new ObjectId(), theoreticalDuration: 'PT3600S' },
        ],
      },
    };
    const result = await CourseHelper.getTotalTheoreticalDuration(course);
    expect(result).toBe('PT4104S');
  });

  it('should return 0 if no steps', async () => {
    const course = { subProgram: { steps: [] } };
    const result = await CourseHelper.getTotalTheoreticalDuration(course);
    expect(result).toBe('PT0S');
  });
});

describe('list', () => {
  let findCourseAndPopulate;
  let userFindOne;
  let find;
  let getTotalTheoreticalDurationSpy;
  let formatCourseWithProgress;
  const authCompany = new ObjectId();
  const credentials = { _id: new ObjectId(), role: { vendor: { name: TRAINING_ORGANISATION_MANAGER } } };
  const isVendorUser = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(get(credentials, 'role.vendor.name'));

  beforeEach(() => {
    findCourseAndPopulate = sinon.stub(CourseRepository, 'findCourseAndPopulate');
    userFindOne = sinon.stub(User, 'findOne');
    find = sinon.stub(Course, 'find');
    getTotalTheoreticalDurationSpy = sinon.spy(CourseHelper, 'getTotalTheoreticalDuration');
    formatCourseWithProgress = sinon.stub(CourseHelper, 'formatCourseWithProgress');
  });
  afterEach(() => {
    findCourseAndPopulate.restore();
    userFindOne.restore();
    find.restore();
    getTotalTheoreticalDurationSpy.restore();
    formatCourseWithProgress.restore();
  });

  describe('OPERATIONS', () => {
    it('should return courses', async () => {
      const coursesList = [{ _id: new ObjectId(), misc: 'name' }, { _id: new ObjectId(), misc: 'program' }];

      findCourseAndPopulate.returns(coursesList);

      const query = { trainer: '1234567890abcdef12345678', format: 'blended', action: 'operations', origin: 'webapp' };
      const result = await CourseHelper.list(query, credentials);

      expect(result).toMatchObject(coursesList);
      sinon.assert.calledOnceWithExactly(
        findCourseAndPopulate,
        { trainer: '1234567890abcdef12345678', format: 'blended' },
        'webapp'
      );
      sinon.assert.notCalled(getTotalTheoreticalDurationSpy);
      sinon.assert.notCalled(userFindOne);
      sinon.assert.notCalled(find);
      sinon.assert.notCalled(formatCourseWithProgress);
    });

    it('should return eLearning courses', async () => {
      const coursesList = [
        {
          misc: 'name',
          subProgram: {
            steps: [
              { _id: new ObjectId(), theoreticalDuration: 'PT2880S' },
              { _id: new ObjectId(), theoreticalDuration: 'PT1080S' },
              { _id: new ObjectId() },
            ],
          },
        },
        { misc: 'program', subProgram: { steps: [] } },
      ];
      const formattedCourseList = [
        { misc: 'name', totalTheoreticalDuration: 'PT3960S' },
        { misc: 'program', totalTheoreticalDuration: 'PT0S' },
      ];

      findCourseAndPopulate.returns(coursesList);

      const query = { format: 'strictly_e_learning', action: 'operations', origin: 'webapp' };
      const result = await CourseHelper.list(query, credentials);

      expect(result).toMatchObject(formattedCourseList);
      sinon.assert.calledOnceWithExactly(
        findCourseAndPopulate,
        { format: 'strictly_e_learning' },
        'webapp'
      );
      sinon.assert.calledTwice(getTotalTheoreticalDurationSpy);
      sinon.assert.notCalled(userFindOne);
      sinon.assert.notCalled(find);
      sinon.assert.notCalled(formatCourseWithProgress);
    });

    it('should return company courses', async () => {
      const courseIdList = [new ObjectId(), new ObjectId(), new ObjectId()];
      const coursesList = [
        { _id: courseIdList[0], misc: 'name', type: INTRA },
        { _id: courseIdList[1], misc: 'name2', type: INTRA },
        {
          _id: courseIdList[2],
          misc: 'program',
          type: INTER_B2B,
          trainees: [{ identity: { firstname: 'Bonjour' }, company: { _id: authCompany } }],
        },
      ];
      const returnedList = [
        { _id: courseIdList[0], misc: 'name', type: INTRA },
        { _id: courseIdList[1], misc: 'name2', type: INTRA },
        {
          _id: courseIdList[2],
          misc: 'program',
          type: INTER_B2B,
          trainees: [
            { identity: { firstname: 'Bonjour' }, company: { _id: authCompany } },
            { identity: { firstname: 'Au revoir' }, company: { _id: new ObjectId() } },
          ],
        },
      ];

      findCourseAndPopulate.returns(returnedList);

      const query = {
        company: authCompany.toHexString(),
        trainer: '1234567890abcdef12345678',
        format: 'blended',
        action: 'operations',
        origin: 'webapp',
      };
      const result = await CourseHelper.list(query, credentials);

      expect(result).toMatchObject(coursesList);
      sinon.assert.calledOnceWithExactly(
        findCourseAndPopulate,
        { companies: authCompany.toHexString(), trainer: '1234567890abcdef12345678', format: 'blended' },
        'webapp',
        true
      );
      sinon.assert.notCalled(getTotalTheoreticalDurationSpy);
      sinon.assert.notCalled(userFindOne);
      sinon.assert.notCalled(find);
      sinon.assert.notCalled(formatCourseWithProgress);
    });

    it('should return company eLearning courses', async () => {
      const companyId = new ObjectId();
      const traineeId = new ObjectId();
      const coursesList = [
        {
          accessRules: [],
          format: 'strictly_e_learning',
          trainees: [
            { _id: traineeId, company: { _id: companyId } },
            { _id: new ObjectId(), company: { _id: new ObjectId() } },
            { _id: new ObjectId() },
          ],
          subProgram: {
            steps: [
              { _id: new ObjectId(), theoreticalDuration: 'PT1440S' },
              { _id: new ObjectId(), theoreticalDuration: 'PT5040S' },
              { _id: new ObjectId() },
            ],
          },
        },
        { accessRules: [companyId], format: 'strictly_e_learning', trainees: [], subProgram: { steps: [] } },
      ];
      const filteredCourseList = [
        {
          accessRules: [],
          format: 'strictly_e_learning',
          totalTheoreticalDuration: 'PT6480S',
          trainees: [
            { _id: traineeId, company: { _id: companyId } },
          ],
        },
        { accessRules: [companyId], format: 'strictly_e_learning', totalTheoreticalDuration: 'PT0S', trainees: [] },
      ];

      findCourseAndPopulate.returns(coursesList);

      const query = { company: companyId, format: 'strictly_e_learning', action: 'operations', origin: 'webapp' };
      const result = await CourseHelper.list(query, credentials);
      expect(result).toMatchObject(filteredCourseList);
      sinon.assert.calledOnceWithExactly(
        findCourseAndPopulate,
        { format: 'strictly_e_learning', accessRules: { $in: [companyId, []] } },
        'webapp'
      );
      sinon.assert.calledTwice(getTotalTheoreticalDurationSpy);
      sinon.assert.notCalled(userFindOne);
      sinon.assert.notCalled(find);
      sinon.assert.notCalled(formatCourseWithProgress);
    });
  });

  describe('PEDAGOGY', () => {
    it('should return courses for trainees, vendor', async () => {
      const traineeCompany = new ObjectId();
      const trainee = {
        _id: new ObjectId(),
        userCompanyList: [{ company: traineeCompany, startDate: '2021-01-01T10:00:00.000Z' }],
      };
      const stepId = new ObjectId();
      const coursesList = [
        {
          misc: 'name',
          _id: new ObjectId(),
          format: BLENDED,
          subProgram: {
            steps: [{
              _id: new ObjectId(),
              activities: [{ activityHistories: [{}, {}] }],
              name: 'Développement personnel full stack',
              type: 'e_learning',
              theoreticalDuration: 'PT5400S',
              areActivitiesValid: false,
            },
            {
              _id: stepId,
              activities: [],
              name: 'Développer des équipes agiles et autonomes',
              type: 'on_site',
              areActivitiesValid: true,
            },
            ],
          },
          slots: [
            {
              startDate: '2020-11-03T09:00:00.000Z',
              endDate: '2020-11-03T12:00:00.000Z',
              step: stepId,
              attendances: [{ _id: new ObjectId() }],
            },
            {
              startDate: '2020-11-04T09:01:00.000Z',
              endDate: '2020-11-04T16:01:00.000Z',
              step: stepId,
              attendances: [],
            },
          ],
        },
        {
          misc: 'program',
          _id: new ObjectId(),
          format: BLENDED,
          subProgram: {
            steps: [{
              _id: new ObjectId(),
              activities: [{ activityHistories: [{}, {}] }],
              name: 'Brochure : le mal de dos',
              type: 'e_learning',
              theoreticalDuration: 'PT5400S',
              areActivitiesValid: false,
            }, {
              _id: stepId,
              activities: [],
              name: 'Enjailler son équipe autonome',
              type: 'on_site',
              areActivitiesValid: true,
            }],
          },
          slots: [
            {
              startDate: '2019-11-06T09:00:00.000Z',
              endDate: '2019-11-06T12:00:00.000Z',
              step: stepId,
              attendances: [{ _id: new ObjectId() }],
            },
            {
              startDate: '2019-12-22T09:00:00.000Z',
              endDate: '2019-12-22T16:01:00.000Z',
              step: stepId,
              attendances: [],
            },
          ],
        },
      ];
      const query = { action: 'pedagogy', origin: 'webapp', trainee: trainee._id };

      userFindOne.returns(SinonMongoose.stubChainedQueries(trainee, ['populate', 'setOptions', 'lean']));
      find.returns(SinonMongoose.stubChainedQueries(coursesList, ['populate', 'select', 'lean']));

      formatCourseWithProgress.onCall(0).returns({
        ...coursesList[0],
        subProgram: {
          ...coursesList[0].subProgram,
          steps: [
            { ...coursesList[0].subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...coursesList[0].subProgram.steps[1],
              progress: { live: 1, presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } } },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });
      formatCourseWithProgress.onCall(1).returns({
        ...coursesList[1],
        subProgram: {
          ...coursesList[1].subProgram,
          steps: [
            { ...coursesList[1].subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...coursesList[1].subProgram.steps[1],
              progress: { live: 1, presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } } },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });

      const result = await CourseHelper.list(query, credentials);

      expect(result).toMatchObject(coursesList.map(
        course => (
          {
            ...course,
            subProgram: {
              ...course.subProgram,
              steps: [
                { ...course.subProgram.steps[0], progress: { eLearning: 1 } },
                {
                  ...course.subProgram.steps[1],
                  progress: {
                    live: 1,
                    presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
                  },
                },
              ],
            },
            progress: {
              eLearning: 1,
              live: 1,
              presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
            },
          }
        )
      ));

      SinonMongoose.calledOnceWithExactly(
        userFindOne,
        [
          { query: 'findOne', args: [{ _id: trainee._id }] },
          { query: 'populate', args: [{ path: 'userCompanyList' }] },
          { query: 'setOptions', args: [{ credentials }] },
          { query: 'lean' },
        ]
      );

      SinonMongoose.calledOnceWithExactly(
        find,
        [
          {
            query: 'find',
            args: [
              {
                trainees: trainee._id,
                $or: [
                  {
                    format: STRICTLY_E_LEARNING,
                    $or: [{ accessRules: [] }, { accessRules: { $in: [traineeCompany] } }],
                  },
                  { format: BLENDED, companies: { $in: [traineeCompany] } },
                ],
              },
              { format: 1 },
            ],
          },
          {
            query: 'populate',
            args: [{
              path: 'subProgram',
              select: 'program steps',
              populate: [
                { path: 'program', select: 'name image description' },
                {
                  path: 'steps',
                  select: 'name type activities theoreticalDuration',
                  populate: {
                    path: 'activities',
                    select: 'name type cards activityHistories',
                    populate: [
                      { path: 'activityHistories', match: { user: trainee._id } },
                      { path: 'cards', select: 'template' },
                    ],
                  },
                },
              ],
            }],
          },
          {
            query: 'populate',
            args: [{
              path: 'slots',
              select: 'startDate endDate step',
              populate: [
                { path: 'step', select: 'type' },
                {
                  path: 'attendances',
                  match: { trainee: trainee._id, company: { $in: [traineeCompany] } },
                  options: { isVendorUser },
                },
              ],
            }],
          },
          { query: 'select', args: ['_id misc'] },
          { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
        ]
      );

      sinon.assert.calledWithExactly(formatCourseWithProgress.getCall(0), coursesList[0]);
      sinon.assert.calledWithExactly(formatCourseWithProgress.getCall(1), coursesList[1]);
    });

    it('should return courses for trainees, client', async () => {
      const traineeCompany = new ObjectId();
      const trainee = { _id: new ObjectId() };
      const stepId = new ObjectId();
      const coursesList = [
        {
          misc: 'name',
          _id: new ObjectId(),
          format: BLENDED,
          subProgram: {
            steps: [{
              _id: new ObjectId(),
              activities: [{ activityHistories: [{}, {}] }],
              name: 'Développement personnel full stack',
              type: 'e_learning',
              theoreticalDuration: 'PT5400S',
              areActivitiesValid: false,
            },
            {
              _id: stepId,
              activities: [],
              name: 'Développer des équipes agiles et autonomes',
              type: 'on_site',
              areActivitiesValid: true,
            },
            ],
          },
          slots: [
            {
              startDate: '2020-11-03T09:00:00.000Z',
              endDate: '2020-11-03T12:00:00.000Z',
              step: stepId,
              attendances: [{ _id: new ObjectId() }],
            },
            {
              startDate: '2020-11-04T09:01:00.000Z',
              endDate: '2020-11-04T16:01:00.000Z',
              step: stepId,
              attendances: [],
            },
          ],
        },
        {
          misc: 'program',
          _id: new ObjectId(),
          format: BLENDED,
          subProgram: {
            steps: [{
              _id: new ObjectId(),
              activities: [{ activityHistories: [{}, {}] }],
              name: 'Brochure : le mal de dos',
              type: 'e_learning',
              theoreticalDuration: 'PT5400S',
              areActivitiesValid: false,
            }, {
              _id: stepId,
              activities: [],
              name: 'Enjailler son équipe autonome',
              type: 'on_site',
              areActivitiesValid: true,
            }],
          },
          slots: [
            {
              startDate: '2019-11-06T09:00:00.000Z',
              endDate: '2019-11-06T12:00:00.000Z',
              step: stepId,
              attendances: [{ _id: new ObjectId() }],
            },
            {
              startDate: '2019-12-22T09:00:00.000Z',
              endDate: '2019-12-22T16:01:00.000Z',
              step: stepId,
              attendances: [],
            },
          ],
        },
      ];
      const query = { action: 'pedagogy', company: traineeCompany, origin: 'webapp', trainee: trainee._id };

      userFindOne.returns(SinonMongoose.stubChainedQueries(trainee, ['populate', 'setOptions', 'lean']));
      find.returns(SinonMongoose.stubChainedQueries(coursesList, ['populate', 'select', 'lean']));

      formatCourseWithProgress.onCall(0).returns({
        ...coursesList[0],
        subProgram: {
          ...coursesList[0].subProgram,
          steps: [
            { ...coursesList[0].subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...coursesList[0].subProgram.steps[1],
              progress: { live: 1, presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } } },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });
      formatCourseWithProgress.onCall(1).returns({
        ...coursesList[1],
        subProgram: {
          ...coursesList[1].subProgram,
          steps: [
            { ...coursesList[1].subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...coursesList[1].subProgram.steps[1],
              progress: { live: 1, presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } } },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });

      const result = await CourseHelper.list(query, credentials);

      expect(result).toMatchObject(coursesList.map(
        course => (
          {
            ...course,
            subProgram: {
              ...course.subProgram,
              steps: [
                { ...course.subProgram.steps[0], progress: { eLearning: 1 } },
                {
                  ...course.subProgram.steps[1],
                  progress: {
                    live: 1,
                    presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
                  },
                },
              ],
            },
            progress: {
              eLearning: 1,
              live: 1,
              presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
            },
          }
        )
      ));

      SinonMongoose.calledOnceWithExactly(
        userFindOne,
        [
          { query: 'findOne', args: [{ _id: trainee._id }] },
          { query: 'populate', args: [{ path: 'userCompanyList' }] },
          { query: 'setOptions', args: [{ credentials }] },
          { query: 'lean' },
        ]
      );

      SinonMongoose.calledOnceWithExactly(
        find,
        [
          {
            query: 'find',
            args: [
              {
                trainees: trainee._id,
                $or: [
                  {
                    format: STRICTLY_E_LEARNING,
                    $or: [{ accessRules: [] }, { accessRules: { $in: [traineeCompany] } }],
                  },
                  { format: BLENDED, companies: { $in: [traineeCompany] } },
                ],
              },
              { format: 1 },
            ],
          },
          {
            query: 'populate',
            args: [{
              path: 'subProgram',
              select: 'program steps',
              populate: [
                { path: 'program', select: 'name image description' },
                {
                  path: 'steps',
                  select: 'name type activities theoreticalDuration',
                  populate: {
                    path: 'activities',
                    select: 'name type cards activityHistories',
                    populate: [
                      { path: 'activityHistories', match: { user: trainee._id } },
                      { path: 'cards', select: 'template' },
                    ],
                  },
                },
              ],
            }],
          },
          {
            query: 'populate',
            args: [{
              path: 'slots',
              select: 'startDate endDate step',
              populate: [
                { path: 'step', select: 'type' },
                {
                  path: 'attendances',
                  match: { trainee: trainee._id, company: { $in: [traineeCompany] } },
                  options: { isVendorUser },
                },
              ],
            }],
          },
          { query: 'select', args: ['_id misc'] },
          { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
        ]
      );

      sinon.assert.calledWithExactly(formatCourseWithProgress.getCall(0), coursesList[0]);
      sinon.assert.calledWithExactly(formatCourseWithProgress.getCall(1), coursesList[1]);
    });

    it('should return courses for loggedUser', async () => {
      const traineeCompanies = [new ObjectId(), new ObjectId()];
      const trainee = {
        _id: credentials._id,
        userCompanyList: [
          { company: traineeCompanies[0], startDate: '2020-01-01T10:00:00.000Z', endDate: '2020-12-31T22:00:00:000Z' },
          { company: traineeCompanies[1], startDate: '2021-01-01T10:00:00.000Z' },
        ],
      };
      const stepId = new ObjectId();
      const coursesList = [
        {
          misc: 'name',
          _id: new ObjectId(),
          format: BLENDED,
          subProgram: {
            steps: [{
              _id: new ObjectId(),
              activities: [{ activityHistories: [{}, {}] }],
              name: 'Développement personnel full stack',
              type: 'e_learning',
              theoreticalDuration: 'PT5400S',
              areActivitiesValid: false,
            },
            {
              _id: stepId,
              activities: [],
              name: 'Développer des équipes agiles et autonomes',
              type: 'on_site',
              areActivitiesValid: true,
            },
            ],
          },
          slots: [
            {
              startDate: '2020-11-03T09:00:00.000Z',
              endDate: '2020-11-03T12:00:00.000Z',
              step: stepId,
              attendances: [{ _id: new ObjectId() }],
            },
            {
              startDate: '2020-11-04T09:01:00.000Z',
              endDate: '2020-11-04T16:01:00.000Z',
              step: stepId,
              attendances: [],
            },
          ],
        },
        {
          misc: 'program',
          _id: new ObjectId(),
          format: BLENDED,
          subProgram: {
            steps: [{
              _id: new ObjectId(),
              activities: [{ activityHistories: [{}, {}] }],
              name: 'Brochure : le mal de dos',
              type: 'e_learning',
              theoreticalDuration: 'PT5400S',
              areActivitiesValid: false,
            }, {
              _id: stepId,
              activities: [],
              name: 'Enjailler son équipe autonome',
              type: 'on_site',
              areActivitiesValid: true,
            }],
          },
          slots: [
            {
              startDate: '2019-11-06T09:00:00.000Z',
              endDate: '2019-11-06T12:00:00.000Z',
              step: stepId,
              attendances: [{ _id: new ObjectId() }],
            },
            {
              startDate: '2019-12-22T09:00:00.000Z',
              endDate: '2019-12-22T16:01:00.000Z',
              step: stepId,
              attendances: [],
            },
          ],
        },
      ];
      const query = { action: 'pedagogy', origin: 'mobile' };

      userFindOne.returns(SinonMongoose.stubChainedQueries(trainee, ['populate', 'setOptions', 'lean']));
      find.returns(SinonMongoose.stubChainedQueries(coursesList, ['populate', 'select', 'lean']));

      formatCourseWithProgress.onCall(0).returns({
        ...coursesList[0],
        subProgram: {
          ...coursesList[0].subProgram,
          steps: [
            { ...coursesList[0].subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...coursesList[0].subProgram.steps[1],
              progress: { live: 1, presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } } },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });
      formatCourseWithProgress.onCall(1).returns({
        ...coursesList[1],
        subProgram: {
          ...coursesList[1].subProgram,
          steps: [
            { ...coursesList[1].subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...coursesList[1].subProgram.steps[1],
              progress: { live: 1, presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } } },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });

      const result = await CourseHelper.list(query, credentials);

      expect(result).toMatchObject(coursesList.map(
        course => (
          {
            ...course,
            subProgram: {
              ...course.subProgram,
              steps: [
                { ...course.subProgram.steps[0], progress: { eLearning: 1 } },
                {
                  ...course.subProgram.steps[1],
                  progress: {
                    live: 1,
                    presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
                  },
                },
              ],
            },
            progress: {
              eLearning: 1,
              live: 1,
              presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
            },
          }
        )
      ));

      SinonMongoose.calledOnceWithExactly(
        userFindOne,
        [
          { query: 'findOne', args: [{ _id: trainee._id }] },
          { query: 'populate', args: [{ path: 'userCompanyList' }] },
          { query: 'setOptions', args: [{ credentials }] },
          { query: 'lean' },
        ]
      );

      SinonMongoose.calledOnceWithExactly(
        find,
        [
          {
            query: 'find',
            args: [
              {
                trainees: trainee._id,
                $or: [
                  {
                    format: STRICTLY_E_LEARNING,
                    $or: [{ accessRules: [] }, { accessRules: { $in: traineeCompanies } }],
                  },
                  { format: BLENDED, companies: { $in: traineeCompanies } },
                ],
              },
              { format: 1 },
            ],
          },
          {
            query: 'populate',
            args: [{
              path: 'subProgram',
              select: 'program steps',
              populate: [
                { path: 'program', select: 'name image description' },
                {
                  path: 'steps',
                  select: 'name type activities theoreticalDuration',
                  populate: {
                    path: 'activities',
                    select: 'name type cards activityHistories',
                    populate: [
                      { path: 'activityHistories', match: { user: trainee._id } },
                      { path: 'cards', select: 'template' },
                    ],
                  },
                },
              ],
            }],
          },
          {
            query: 'populate',
            args: [{
              path: 'slots',
              select: 'startDate endDate step',
              populate: [
                { path: 'step', select: 'type' },
                {
                  path: 'attendances',
                  match: { trainee: trainee._id, company: { $in: traineeCompanies } },
                  options: { isVendorUser },
                },
              ],
            }],
          },
          { query: 'select', args: ['_id misc'] },
          { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
        ]
      );

      sinon.assert.calledWithExactly(formatCourseWithProgress.getCall(0), coursesList[0]);
      sinon.assert.calledWithExactly(formatCourseWithProgress.getCall(1), coursesList[1]);
    });
  });
});

describe('getCourseProgress', () => {
  it('should get progress for course whose steps only have one progress', async () => {
    const steps = [{
      _id: new ObjectId(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: E_LEARNING,
      areActivitiesValid: false,
      progress: { eLearning: 1 },
    },
    {
      _id: new ObjectId(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: E_LEARNING,
      areActivitiesValid: false,
      progress: { eLearning: 1 },
    }];

    const result = await CourseHelper.getCourseProgress(steps);
    expect(result).toEqual({ blended: 1, eLearning: 1 });
  });

  it('should get progress for course whose on site steps have severals progresses', async () => {
    const steps = [{
      _id: new ObjectId(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: E_LEARNING,
      areActivitiesValid: false,
      progress: { eLearning: 1 },
    },
    {
      _id: new ObjectId(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: ON_SITE,
      areActivitiesValid: false,
      progress: {
        live: 0.75,
        eLearning: 0.5,
        presence: { attendanceDuration: 'PT120M', maxDuration: 'PT180M' },
      },
    }];

    const result = await CourseHelper.getCourseProgress(steps);
    expect(result).toEqual({
      blended: 0.875,
      eLearning: 0.75,
      presence: { attendanceDuration: 'PT120M', maxDuration: 'PT180M' },
    });
  });

  it('should get progress for course whose a step has progress at 0', async () => {
    const steps = [{
      _id: new ObjectId(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: E_LEARNING,
      areActivitiesValid: false,
      progress: { eLearning: 0 },
    },
    {
      _id: new ObjectId(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: ON_SITE,
      areActivitiesValid: false,
      progress: { live: 1, presence: { attendanceDuration: 'PT120M', maxDuration: 'PT180M' } },
    }];

    const result = await CourseHelper.getCourseProgress(steps);
    expect(result).toEqual({
      blended: 0.5,
      eLearning: 0,
      presence: { attendanceDuration: 'PT120M', maxDuration: 'PT180M' },
    });
  });

  it('should get progress for course whose steps have presence progress', async () => {
    const steps = [{
      _id: new ObjectId(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: ON_SITE,
      areActivitiesValid: false,
      progress: {
        eLearning: 1,
        live: 0.5,
        presence: { attendanceDuration: 'PT120M', maxDuration: 'PT240M' },
      },
    },
    {
      _id: new ObjectId(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: ON_SITE,
      areActivitiesValid: false,
      progress: { live: 1, presence: { attendanceDuration: 'PT120M', maxDuration: 'PT180M' } },
    }];

    const result = await CourseHelper.getCourseProgress(steps);
    expect(result).toEqual({
      blended: 0.75,
      eLearning: 1,
      presence: { attendanceDuration: 'PT240M', maxDuration: 'PT420M' },
    });
  });

  it('should return empty object if no step', async () => {
    const steps = [];

    const result = await CourseHelper.getCourseProgress(steps);
    expect(result).toEqual({});
  });
});

describe('formatCourseWithProgress', () => {
  let getProgress;
  let getCourseProgress;
  beforeEach(() => {
    getCourseProgress = sinon.stub(CourseHelper, 'getCourseProgress');
    getProgress = sinon.stub(StepHelper, 'getProgress');
  });
  afterEach(() => {
    getCourseProgress.restore();
    getProgress.restore();
  });
  it('should format course', async () => {
    const stepId = new ObjectId();
    const course = {
      misc: 'name',
      _id: new ObjectId(),
      subProgram: {
        steps: [{
          _id: new ObjectId(),
          activities: [{ activityHistories: [{}, {}] }],
          name: 'Développement personnel full stack',
          type: 'e_learning',
          areActivitiesValid: false,
        },
        {
          _id: stepId,
          activities: [],
          name: 'Développer des équipes agiles et autonomes',
          type: 'on_site',
          areActivitiesValid: true,
        },
        ],
      },
      slots: [
        { startDate: '2020-11-03T09:00:00.000Z', endDate: '2020-11-03T12:00:00.000Z', step: stepId, attendances: [] },
        { startDate: '2020-11-04T09:00:00.000Z', endDate: '2020-11-04T16:01:00.000Z', step: stepId, attendances: [] },
      ],
    };
    getProgress.onCall(0).returns({ eLearning: 1 });
    getProgress.onCall(1).returns({
      live: 1,
      presence: { attendanceDuration: { minutes: 0 }, maxDuration: { minutes: 601 } },
    });
    getCourseProgress.returns({
      eLearning: 1,
      live: 1,
      presence: { attendanceDuration: { minutes: 0 }, maxDuration: { minutes: 601 } },
    });

    const result = await CourseHelper.formatCourseWithProgress(course);
    expect(result).toMatchObject({
      ...course,
      subProgram: {
        ...course.subProgram,
        steps: [
          { ...course.subProgram.steps[0], progress: { eLearning: 1 } },
          {
            ...course.subProgram.steps[1],
            progress: { live: 1, presence: { attendanceDuration: { minutes: 0 }, maxDuration: { minutes: 601 } } },
          },
        ],
      },
      progress: {
        eLearning: 1,
        live: 1,
        presence: { attendanceDuration: { minutes: 0 }, maxDuration: { minutes: 601 } },
      },
    });
    sinon.assert.calledWithExactly(getProgress.getCall(0), course.subProgram.steps[0], []);
    sinon.assert.calledWithExactly(getProgress.getCall(1), course.subProgram.steps[1], course.slots);
    sinon.assert.calledWithExactly(getCourseProgress.getCall(0), [
      { ...course.subProgram.steps[0], slots: [], progress: { eLearning: 1 } },
      {
        ...course.subProgram.steps[1],
        slots: course.slots,
        progress: { live: 1, presence: { attendanceDuration: { minutes: 0 }, maxDuration: { minutes: 601 } } },
      },
    ]);
  });
});

describe('getCourse', () => {
  let findOne;
  let formatCourseWithProgress;
  let attendanceCountDocuments;
  beforeEach(() => {
    findOne = sinon.stub(Course, 'findOne');
    formatCourseWithProgress = sinon.stub(CourseHelper, 'formatCourseWithProgress');
    attendanceCountDocuments = sinon.stub(Attendance, 'countDocuments');
  });
  afterEach(() => {
    findOne.restore();
    formatCourseWithProgress.restore();
    attendanceCountDocuments.restore();
  });

  describe('OPERATIONS', () => {
    let getTraineesCompanyAtCourseRegistration;
    const authCompanyId = new ObjectId();
    const otherCompanyId = new ObjectId();
    const traineeIds = [new ObjectId(), new ObjectId()];

    beforeEach(() => {
      getTraineesCompanyAtCourseRegistration =
        sinon.stub(CourseHistoriesHelper, 'getTraineesCompanyAtCourseRegistration');
    });

    afterEach(() => {
      getTraineesCompanyAtCourseRegistration.restore();
    });

    it('should return inter b2b course without trainees filtering (webapp)', async () => {
      const course = {
        _id: new ObjectId(),
        type: INTER_B2B,
        format: BLENDED,
        trainees: [{ _id: traineeIds[0] }, { _id: traineeIds[1] }],
        subProgram: { steps: [{ theoreticalDuration: 'PT3600S' }, { theoreticalDuration: 'PT1800S' }] },
        slots: [{ step: new ObjectId() }],
      };
      findOne.returns(SinonMongoose.stubChainedQueries(course));
      getTraineesCompanyAtCourseRegistration.returns([
        { trainee: traineeIds[0], company: authCompanyId },
        { trainee: traineeIds[1], company: otherCompanyId },
      ]);

      const result = await CourseHelper.getCourse(
        { action: OPERATIONS, origin: WEBAPP },
        { _id: course._id },
        { role: { vendor: { name: 'vendor_admin' } }, company: { _id: new ObjectId() } }
      );
      expect(result).toMatchObject({
        ...course,
        totalTheoreticalDuration: 'PT5400S',
        trainees: [{ _id: traineeIds[0], company: authCompanyId }, { _id: traineeIds[1], company: otherCompanyId }],
      });

      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: course._id }] },
          {
            query: 'populate',
            args: [[
              { path: 'companies', select: 'name' },
              {
                path: 'trainees',
                select: 'identity.firstname identity.lastname local.email contact picture.link firstMobileConnection',
                populate: { path: 'company' },
              },
              {
                path: 'companyRepresentative',
                select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
              },
              {
                path: 'subProgram',
                select: 'program steps',
                populate: [
                  { path: 'program', select: 'name learningGoals' },
                  {
                    path: 'steps',
                    select: 'name type theoreticalDuration',
                    populate: {
                      path: 'activities', select: 'name type', populate: { path: 'activityHistories', select: 'user' },
                    },
                  },
                ],
              },
              { path: 'slots', select: 'step startDate endDate address meetingLink' },
              { path: 'slotsToPlan', select: '_id step' },
              {
                path: 'trainer',
                select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
              },
              { path: 'accessRules', select: 'name' },
              {
                path: 'salesRepresentative',
                select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
              },
              { path: 'contact', select: 'identity.firstname identity.lastname contact.phone' },
            ]],
          },
          { query: 'lean' },
        ]
      );
      sinon.assert.calledOnceWithExactly(
        getTraineesCompanyAtCourseRegistration,
        [traineeIds[0], traineeIds[1]],
        course._id
      );
      sinon.assert.notCalled(formatCourseWithProgress);
      sinon.assert.notCalled(attendanceCountDocuments);
    });

    it('should return inter b2b course with trainees filtering (webapp)', async () => {
      const course = {
        _id: new ObjectId(),
        type: INTER_B2B,
        format: BLENDED,
        trainees: [{ _id: traineeIds[0] }, { _id: traineeIds[1] }],
        subProgram: { steps: [] },
        slots: [{ step: new ObjectId() }],
      };

      const courseWithFilteredTrainees = {
        type: INTER_B2B,
        trainees: [{ _id: traineeIds[0], company: authCompanyId }],
        totalTheoreticalDuration: 'PT0S',
      };

      findOne.returns(SinonMongoose.stubChainedQueries(course));
      getTraineesCompanyAtCourseRegistration.returns([
        { trainee: traineeIds[0], company: authCompanyId },
        { trainee: traineeIds[1], company: otherCompanyId },
      ]);

      const result = await CourseHelper.getCourse(
        { action: OPERATIONS, origin: WEBAPP },
        { _id: course._id },
        { role: { client: { name: 'client_admin' } }, company: { _id: authCompanyId } }
      );

      expect(result).toMatchObject(courseWithFilteredTrainees);
      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: course._id }] },
          {
            query: 'populate',
            args: [
              [
                { path: 'companies', select: 'name' },
                {
                  path: 'trainees',
                  select: 'identity.firstname identity.lastname local.email contact picture.link firstMobileConnection',
                  populate: { path: 'company' },
                },
                {
                  path: 'companyRepresentative',
                  select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
                },
                {
                  path: 'subProgram',
                  select: 'program steps',
                  populate: [
                    { path: 'program', select: 'name learningGoals' },
                    {
                      path: 'steps',
                      select: 'name type theoreticalDuration',
                      populate: {
                        path: 'activities',
                        select: 'name type',
                        populate: { path: 'activityHistories', select: 'user' },
                      },
                    },
                  ],
                },
                { path: 'slots', select: 'step startDate endDate address meetingLink' },
                { path: 'slotsToPlan', select: '_id step' },
                {
                  path: 'trainer',
                  select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
                },
                { path: 'accessRules', select: 'name' },
                {
                  path: 'salesRepresentative',
                  select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
                },
                { path: 'contact', select: 'identity.firstname identity.lastname contact.phone' },
              ]],
          },
          { query: 'lean' },
        ]
      );
      sinon.assert.calledOnceWithExactly(
        getTraineesCompanyAtCourseRegistration,
        [traineeIds[0], traineeIds[1]],
        course._id
      );
      sinon.assert.notCalled(formatCourseWithProgress);
      sinon.assert.notCalled(attendanceCountDocuments);
    });

    it('should return course for trainer (mobile)', async () => {
      const course = {
        _id: new ObjectId(),
        type: INTER_B2B,
        format: BLENDED,
        trainees: [{ _id: traineeIds[0] }, { _id: traineeIds[1] }],
        subProgram: { steps: [{ theoreticalDuration: 'PT3600S' }, { theoreticalDuration: 'PT1800S' }] },
      };
      findOne.returns(SinonMongoose.stubChainedQueries(course));
      getTraineesCompanyAtCourseRegistration.returns([
        { trainee: traineeIds[0], company: authCompanyId },
        { trainee: traineeIds[1], company: otherCompanyId },
      ]);

      const result = await CourseHelper.getCourse(
        { action: OPERATIONS, origin: MOBILE },
        { _id: course._id },
        { role: { vendor: { name: 'trainer' } }, company: { _id: new ObjectId() } }
      );
      expect(result).toMatchObject({
        ...course,
        totalTheoreticalDuration: 'PT5400S',
        trainees: [
          { _id: traineeIds[0], company: authCompanyId },
          { _id: traineeIds[1], company: otherCompanyId },
        ],
      });

      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: course._id }] },
          {
            query: 'populate',
            args: [[
              { path: 'companies', select: 'name' },
              {
                path: 'trainees',
                select: 'identity.firstname identity.lastname local.email contact picture.link firstMobileConnection',
                populate: { path: 'company' },
              },
              {
                path: 'companyRepresentative',
                select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
              },
              {
                path: 'subProgram',
                select: 'program steps',
                populate: [
                  { path: 'program', select: 'name learningGoals' },
                ],
              },
              { path: 'slots', select: 'startDate' },
            ]],
          },
          { query: 'lean' },
        ]
      );
      sinon.assert.calledOnceWithExactly(
        getTraineesCompanyAtCourseRegistration,
        [traineeIds[0], traineeIds[1]],
        course._id
      );
      sinon.assert.notCalled(formatCourseWithProgress);
      sinon.assert.notCalled(attendanceCountDocuments);
    });

    it('should return eLearning course with trainees filtering (webapp)', async () => {
      const course = {
        _id: new ObjectId(),
        type: INTER_B2C,
        format: E_LEARNING,
        trainees: [{ _id: new ObjectId(), company: authCompanyId }],
        subProgram: {
          steps: [{
            _id: new ObjectId(),
            activities: [],
            name: 'Développement personnel',
            type: 'e_learning',
            theoreticalDuration: 'PT5400S',
            areActivitiesValid: false,
          }],
        },
      };
      findOne.returns(SinonMongoose.stubChainedQueries(course));

      const result = await CourseHelper.getCourse(
        { action: OPERATIONS, origin: WEBAPP },
        { _id: course._id },
        { role: { client: { name: 'client_admin' } }, company: { _id: authCompanyId } }
      );
      expect(result).toMatchObject({
        ...course,
        totalTheoreticalDuration: 'PT5400S',
      });

      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: course._id }] },
          {
            query: 'populate',
            args: [[
              { path: 'companies', select: 'name' },
              {
                path: 'trainees',
                select: 'identity.firstname identity.lastname local.email contact picture.link firstMobileConnection',
                populate: { path: 'company' },

              },
              {
                path: 'companyRepresentative',
                select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
              },
              {
                path: 'subProgram',
                select: 'program steps',
                populate: [
                  { path: 'program', select: 'name learningGoals' },
                  {
                    path: 'steps',
                    select: 'name type theoreticalDuration',
                    populate: {
                      path: 'activities', select: 'name type', populate: { path: 'activityHistories', select: 'user' },
                    },
                  },
                ],
              },
              { path: 'slots', select: 'step startDate endDate address meetingLink' },
              { path: 'slotsToPlan', select: '_id step' },
              {
                path: 'trainer',
                select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
              },
              { path: 'accessRules', select: 'name' },
              {
                path: 'salesRepresentative',
                select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
              },
              { path: 'contact', select: 'identity.firstname identity.lastname contact.phone' },
            ]],
          },
          { query: 'lean' },
        ]
      );
      sinon.assert.notCalled(getTraineesCompanyAtCourseRegistration);
      sinon.assert.notCalled(formatCourseWithProgress);
      sinon.assert.notCalled(attendanceCountDocuments);
    });
  });

  describe('PEDAGOGY', () => {
    it('should return elearning course for trainee', async () => {
      const authCompanyId = new ObjectId();
      const loggedUser = {
        _id: ObjectId(),
        role: { client: { name: 'client_admin' } },
        company: { _id: authCompanyId },
      };
      const course = {
        _id: new ObjectId(),
        subProgram: {
          isStrictlyELearning: true,
          steps: [{
            _id: new ObjectId(),
            activities: [{ activityHistories: [{}, {}] }],
            name: 'Développement personnel full stack',
            type: 'e_learning',
            areActivitiesValid: false,
            theoreticalDuration: 'PT1800S',
          },
          ],
        },
      };

      findOne.returns(SinonMongoose.stubChainedQueries(course, ['populate', 'select', 'lean']));

      formatCourseWithProgress.returns({
        ...course,
        subProgram: {
          ...course.subProgram,
          steps: [{ ...course.subProgram.steps[0], progress: { eLearning: 1 } }],
        },
        progress: { eLearning: 1 },
      });

      const result = await CourseHelper.getCourse({ action: PEDAGOGY }, { _id: course._id }, loggedUser);
      expect(result).toMatchObject({
        ...course,
        subProgram: {
          ...course.subProgram,
          steps: [{ ...course.subProgram.steps[0], progress: { eLearning: 1 } }],
        },
        progress: { eLearning: 1 },
      });

      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: course._id }] },
          {
            query: 'populate',
            args: [{
              path: 'subProgram',
              select: 'program steps',
              populate: [
                { path: 'program', select: 'name image description learningGoals' },
                {
                  path: 'steps',
                  select: 'name type activities theoreticalDuration',
                  populate: {
                    path: 'activities',
                    select: 'name type cards activityHistories',
                    populate: [
                      { path: 'activityHistories', match: { user: loggedUser._id } },
                      { path: 'cards', select: 'template' },
                    ],
                  },
                },
              ],
            }],
          },
          {
            query: 'populate',
            args: [
              {
                path: 'slots',
                select: 'startDate endDate step address meetingLink',
                populate: [
                  { path: 'step', select: 'type' },
                  { path: 'attendances', match: { trainee: loggedUser._id }, options: { requestingOwnInfos: true } },
                ],
              },
            ],
          },
          {
            query: 'populate',
            args: [{
              path: 'trainer',
              select: 'identity.firstname identity.lastname biography picture',
            }],
          },
          {
            query: 'populate',
            args: [{
              path: 'contact',
              select: 'identity.firstname identity.lastname contact.phone local.email',
            }],
          },
          { query: 'select', args: ['_id misc'] },
          { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
        ]
      );

      sinon.assert.calledOnceWithExactly(formatCourseWithProgress, course);
      sinon.assert.notCalled(attendanceCountDocuments);
    });

    it('should return blended course for trainee (no attendance on last slot)', async () => {
      const authCompanyId = new ObjectId();
      const loggedUser = {
        _id: ObjectId(),
        role: { client: { name: 'client_admin' } },
        company: { _id: authCompanyId },
      };
      const stepId = new ObjectId();
      const lastSlotId = new ObjectId();
      const course = {
        _id: new ObjectId(),
        subProgram: {
          isStrictlyELearning: false,
          steps: [{
            _id: new ObjectId(),
            activities: [{ activityHistories: [{}, {}] }],
            name: 'Développement personnel full stack',
            type: 'e_learning',
            areActivitiesValid: false,
            theoreticalDuration: 'PT1800S',
          },
          {
            _id: stepId,
            activities: [],
            name: 'Développer des équipes agiles et autonomes',
            type: 'on_site',
            areActivitiesValid: true,
            theoreticalDuration: 'PT12600S',
          },
          ],
        },
        slots: [
          {
            _id: new ObjectId(),
            startDate: '2020-11-03T09:00:00.000Z',
            endDate: '2020-11-03T12:00:00.000Z',
            step: stepId,
            attendances: [{ _id: new ObjectId() }],
          },
          {
            _id: lastSlotId,
            startDate: '2020-11-04T09:00:00.000Z',
            endDate: '2020-11-04T16:01:00.000Z',
            step: stepId,
            attendances: [],
          },
        ],
      };

      findOne.returns(SinonMongoose.stubChainedQueries(course, ['populate', 'select', 'lean']));
      attendanceCountDocuments.returns(0);

      formatCourseWithProgress.returns({
        ...course,
        areLastSlotAttendancesValidated: false,
        subProgram: {
          ...course.subProgram,
          steps: [
            { ...course.subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...course.subProgram.steps[1],
              progress: {
                live: 1,
                presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
              },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });

      const result = await CourseHelper.getCourse({ action: PEDAGOGY }, { _id: course._id }, loggedUser);

      expect(result).toMatchObject({
        ...course,
        areLastSlotAttendancesValidated: false,
        subProgram: {
          ...course.subProgram,
          steps: [
            { ...course.subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...course.subProgram.steps[1],
              progress: {
                live: 1,
                presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
              },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });

      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: course._id }] },
          {
            query: 'populate',
            args: [{
              path: 'subProgram',
              select: 'program steps',
              populate: [
                { path: 'program', select: 'name image description learningGoals' },
                {
                  path: 'steps',
                  select: 'name type activities theoreticalDuration',
                  populate: {
                    path: 'activities',
                    select: 'name type cards activityHistories',
                    populate: [
                      { path: 'activityHistories', match: { user: loggedUser._id } },
                      { path: 'cards', select: 'template' },
                    ],
                  },
                },
              ],
            }],
          },
          {
            query: 'populate',
            args: [
              {
                path: 'slots',
                select: 'startDate endDate step address meetingLink',
                populate: [
                  { path: 'step', select: 'type' },
                  { path: 'attendances', match: { trainee: loggedUser._id }, options: { requestingOwnInfos: true } },
                ],
              },
            ],
          },
          {
            query: 'populate',
            args: [{
              path: 'trainer',
              select: 'identity.firstname identity.lastname biography picture',
            }],
          },
          {
            query: 'populate',
            args: [{
              path: 'contact',
              select: 'identity.firstname identity.lastname contact.phone local.email',
            }],
          },
          { query: 'select', args: ['_id misc'] },
          { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
        ]
      );

      sinon.assert.calledOnceWithExactly(
        formatCourseWithProgress,
        { ...course, areLastSlotAttendancesValidated: false }
      );
      sinon.assert.calledOnceWithExactly(attendanceCountDocuments, { courseSlot: lastSlotId });
    });

    it('should return blended course for trainee (attendance on last slot)', async () => {
      const authCompanyId = new ObjectId();
      const loggedUser = {
        _id: ObjectId(),
        role: { client: { name: 'client_admin' } },
        company: { _id: authCompanyId },
      };
      const stepId = new ObjectId();
      const lastSlotId = new ObjectId();
      const course = {
        _id: new ObjectId(),
        subProgram: {
          isStrictlyELearning: false,
          steps: [{
            _id: new ObjectId(),
            activities: [{ activityHistories: [{}, {}] }],
            name: 'Développement personnel full stack',
            type: 'e_learning',
            areActivitiesValid: false,
            theoreticalDuration: 'PT1800S',
          },
          {
            _id: stepId,
            activities: [],
            name: 'Développer des équipes agiles et autonomes',
            type: 'on_site',
            areActivitiesValid: true,
            theoreticalDuration: 'PT12600S',
          },
          ],
        },
        slots: [
          {
            _id: new ObjectId(),
            startDate: '2020-11-03T09:00:00.000Z',
            endDate: '2020-11-03T12:00:00.000Z',
            step: stepId,
            attendances: [{ _id: new ObjectId() }],
          },
          {
            _id: lastSlotId,
            startDate: '2020-11-04T09:00:00.000Z',
            endDate: '2020-11-04T16:01:00.000Z',
            step: stepId,
            attendances: [{ _id: new ObjectId() }],
          },
        ],
      };

      findOne.returns(SinonMongoose.stubChainedQueries(course, ['populate', 'select', 'lean']));
      attendanceCountDocuments.returns(1);

      formatCourseWithProgress.returns({
        ...course,
        areLastSlotAttendancesValidated: true,
        subProgram: {
          ...course.subProgram,
          steps: [
            { ...course.subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...course.subProgram.steps[1],
              progress: {
                live: 1,
                presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
              },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });

      const result = await CourseHelper.getCourse({ action: PEDAGOGY }, { _id: course._id }, loggedUser);

      expect(result).toMatchObject({
        ...course,
        areLastSlotAttendancesValidated: true,
        subProgram: {
          ...course.subProgram,
          steps: [
            { ...course.subProgram.steps[0], progress: { eLearning: 1 } },
            {
              ...course.subProgram.steps[1],
              progress: {
                live: 1,
                presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
              },
            },
          ],
        },
        progress: {
          eLearning: 1,
          live: 1,
          presence: { attendanceDuration: { minutes: 180 }, maxDuration: { minutes: 601 } },
        },
      });

      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: course._id }] },
          {
            query: 'populate',
            args: [{
              path: 'subProgram',
              select: 'program steps',
              populate: [
                { path: 'program', select: 'name image description learningGoals' },
                {
                  path: 'steps',
                  select: 'name type activities theoreticalDuration',
                  populate: {
                    path: 'activities',
                    select: 'name type cards activityHistories',
                    populate: [
                      { path: 'activityHistories', match: { user: loggedUser._id } },
                      { path: 'cards', select: 'template' },
                    ],
                  },
                },
              ],
            }],
          },
          {
            query: 'populate',
            args: [
              {
                path: 'slots',
                select: 'startDate endDate step address meetingLink',
                populate: [
                  { path: 'step', select: 'type' },
                  { path: 'attendances', match: { trainee: loggedUser._id }, options: { requestingOwnInfos: true } },
                ],
              },
            ],
          },
          {
            query: 'populate',
            args: [{
              path: 'trainer',
              select: 'identity.firstname identity.lastname biography picture',
            }],
          },
          {
            query: 'populate',
            args: [{
              path: 'contact',
              select: 'identity.firstname identity.lastname contact.phone local.email',
            }],
          },
          { query: 'select', args: ['_id misc'] },
          { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
        ]
      );

      sinon.assert.calledOnceWithExactly(
        formatCourseWithProgress,
        { ...course, areLastSlotAttendancesValidated: true }
      );
      sinon.assert.calledOnceWithExactly(attendanceCountDocuments, { courseSlot: lastSlotId });
    });

    it('should return course as trainer', async () => {
      const authCompanyId = new ObjectId();
      const loggedUser = {
        _id: ObjectId(),
        role: { vendor: { name: 'trainer' } },
        company: { _id: authCompanyId },
      };
      const courseId = new ObjectId();
      const course = {
        _id: courseId,
        subProgram: {
          isStrictlyELearning: false,
          steps: [{
            activities: [{ activityHistories: [{ user: loggedUser._id }, { user: loggedUser._id }] }],
            name: 'Développement personnel full stack',
            type: 'e_learning',
            areActivitiesValid: false,
            theoreticalDuration: 'PT1800S',
          },
          {
            activities: [],
            name: 'Développer des équipes agiles et autonomes',
            type: 'on_site',
            areActivitiesValid: true,
            theoreticalDuration: 'PT12600S',
          },
          ],
        },
        slots: [{ startDate: '2020-11-03T09:00:00.000Z', endDate: '2020-11-03T12:00:00.000Z' }],
        trainer: { _id: loggedUser._id },
      };

      findOne.returns(SinonMongoose.stubChainedQueries(course, ['populate', 'select', 'lean']));

      const result = await CourseHelper.getCourse({ action: PEDAGOGY }, { _id: course._id }, loggedUser);

      expect(result).toMatchObject({
        _id: courseId,
        subProgram: {
          isStrictlyELearning: false,
          steps: [{
            activities: [{ }],
            name: 'Développement personnel full stack',
            type: 'e_learning',
            areActivitiesValid: false,
            theoreticalDuration: 'PT1800S',
          },
          {
            activities: [],
            name: 'Développer des équipes agiles et autonomes',
            type: 'on_site',
            areActivitiesValid: true,
            theoreticalDuration: 'PT12600S',
          },
          ],
        },
        slots: [{ startDate: '2020-11-03T09:00:00.000Z', endDate: '2020-11-03T12:00:00.000Z' }],
        trainer: { _id: loggedUser._id },
      });

      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: course._id }] },
          {
            query: 'populate',
            args: [{
              path: 'subProgram',
              select: 'program steps',
              populate: [
                { path: 'program', select: 'name image description learningGoals' },
                {
                  path: 'steps',
                  select: 'name type activities theoreticalDuration',
                  populate: {
                    path: 'activities',
                    select: 'name type cards activityHistories',
                    populate: [
                      { path: 'activityHistories', match: { user: loggedUser._id } },
                      { path: 'cards', select: 'template' },
                    ],
                  },
                },
              ],
            }],
          },
          {
            query: 'populate',
            args: [
              {
                path: 'slots',
                select: 'startDate endDate step address meetingLink',
                populate: [
                  { path: 'step', select: 'type' },
                  { path: 'attendances', match: { trainee: loggedUser._id }, options: { requestingOwnInfos: true } },
                ],
              },
            ],
          },
          {
            query: 'populate',
            args: [{
              path: 'trainer',
              select: 'identity.firstname identity.lastname biography picture',
            }],
          },
          {
            query: 'populate',
            args: [{
              path: 'contact',
              select: 'identity.firstname identity.lastname contact.phone local.email',
            }],
          },
          { query: 'select', args: ['_id misc'] },
          { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
        ]
      );

      sinon.assert.notCalled(formatCourseWithProgress);
      sinon.assert.notCalled(attendanceCountDocuments);
    });
  });
});

describe('selectUserHistory', () => {
  it('should return only the last history for each user', () => {
    const user1 = new ObjectId();
    const user2 = new ObjectId();
    const histories = [
      { user: user2.toHexString(), createdAt: '2020-10-03T10:00:00' },
      { user: user1.toHexString(), createdAt: '2020-09-03T10:00:00' },
      { user: user2.toHexString(), createdAt: '2020-08-03T10:00:00' },
      { user: user1.toHexString(), createdAt: '2020-11-03T10:00:00' },
      { user: user2.toHexString(), createdAt: '2020-01-03T10:00:00' },
      { user: user2.toHexString(), createdAt: '2020-02-03T10:00:00' },
    ];

    const result = CourseHelper.selectUserHistory(histories);

    expect(result).toStrictEqual([
      { user: user2.toHexString(), createdAt: '2020-10-03T10:00:00' },
      { user: user1.toHexString(), createdAt: '2020-11-03T10:00:00' },
    ]);
  });
});

describe('formatActivity', () => {
  let selectUserHistory;
  beforeEach(() => {
    selectUserHistory = sinon.stub(CourseHelper, 'selectUserHistory');
  });
  afterEach(() => {
    selectUserHistory.restore();
  });

  it('should return empty follow up if no history', () => {
    const activity = { activityHistories: [] };
    selectUserHistory.returns(activity.activityHistories);
    const result = CourseHelper.formatActivity(activity);

    expect(result).toEqual({ activityHistories: [], followUp: [] });
  });

  it('should return format activity with histories', () => {
    const activity = {
      activityHistories: [
        {
          _id: 'rfvgtgb',
          user: 'qwertyuiop',
          questionnaireAnswersList: [
            { card: { _id: '1234567', title: 'Bonjour' }, answerList: ['2'] },
            { card: { _id: '0987654', title: 'Hello' }, answerList: ['3'] },
          ],
        },
        {
          _id: 'yhnjujm',
          user: 'poiuytre',
          questionnaireAnswersList: [
            { card: { _id: '1234567', title: 'Bonjour' }, answerList: ['3'] },
            { card: { _id: '0987654', title: 'Hello' }, answerList: ['', '4'] },
          ],
        },
        {
          _id: 'zxcvbnm',
          user: 'xzcvbnm',
          questionnaireAnswersList: [
            { card: { _id: '1234567', title: 'Bonjour' }, answerList: ['1'] },
            { card: { _id: '0987654', title: 'Hello' }, answerList: ['4'] },
            { card: { _id: '0987622', title: 'Coucou' }, answerList: [''] },
          ],
        },
      ],
    };
    selectUserHistory.returns(activity.activityHistories);
    const result = CourseHelper.formatActivity(activity);

    expect(result).toEqual({
      activityHistories: ['rfvgtgb', 'yhnjujm', 'zxcvbnm'],
      followUp: [
        { _id: '1234567', title: 'Bonjour', answers: ['2', '3', '1'] },
        { _id: '0987654', title: 'Hello', answers: ['3', '', '4', '4'] },
      ],
    });
  });
});

describe('formatStep', () => {
  let formatActivity;
  beforeEach(() => {
    formatActivity = sinon.stub(CourseHelper, 'formatActivity');
  });
  afterEach(() => {
    formatActivity.restore();
  });

  it('should format step', () => {
    const step = { name: 'Je suis une etape', activities: [{ _id: 'abc' }, { _id: 'def' }, { _id: 'ghi' }] };
    formatActivity.callsFake(a => a._id);
    const result = CourseHelper.formatStep(step);

    expect(result).toEqual({ name: 'Je suis une etape', activities: ['abc', 'def', 'ghi'] });
  });
});

describe('getCourseFollowUp', () => {
  let findOne;
  let formatStep;
  let getTraineesWithElearningProgress;
  beforeEach(() => {
    findOne = sinon.stub(Course, 'findOne');
    formatStep = sinon.stub(CourseHelper, 'formatStep');
    getTraineesWithElearningProgress = sinon.stub(CourseHelper, 'getTraineesWithElearningProgress');
  });
  afterEach(() => {
    findOne.restore();
    formatStep.restore();
    getTraineesWithElearningProgress.restore();
  });

  it('should return course follow up', async () => {
    const companyId = new ObjectId();
    const course = {
      _id: '1234567890',
      subProgram: { name: 'je suis un sous programme', steps: [{ _id: 'abc' }, { _id: 'def' }, { _id: 'ghi' }] },
      trainees: [{ _id: '123213123', company: companyId }],
      slots: [{ _id: '123456789' }],
    };
    const trainees = [1, 2, 3, 4, 5];

    findOne.onCall(0).returns(SinonMongoose.stubChainedQueries({ trainees }, ['lean']));
    findOne.onCall(1).returns(SinonMongoose.stubChainedQueries(course));

    formatStep.callsFake(s => s);
    getTraineesWithElearningProgress.returns([
      { _id: '123213123', steps: { progress: 1 }, progress: 1, company: companyId },
    ]);
    const result = await CourseHelper.getCourseFollowUp(course._id);

    expect(result).toEqual({
      _id: '1234567890',
      subProgram: { name: 'je suis un sous programme', steps: [{ _id: 'abc' }, { _id: 'def' }, { _id: 'ghi' }] },
      trainees: [{ _id: '123213123', company: companyId, steps: { progress: 1 }, progress: 1 }],
      slots: [{ _id: '123456789' }],
    });

    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: course._id }, { trainees: 1 }] }, { query: 'lean' }],
      0
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: course._id }, { subProgram: 1 }] },
        {
          query: 'populate',
          args: [{
            path: 'subProgram',
            select: 'name steps program',
            populate: [
              { path: 'program', select: 'name' },
              {
                path: 'steps',
                select: 'name activities type',
                populate: {
                  path: 'activities',
                  select: 'name type',
                  populate: {
                    path: 'activityHistories',
                    match: { user: { $in: trainees } },
                    populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
                  },
                },
              },
            ],
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'trainees',
            select: 'identity.firstname identity.lastname firstMobileConnection',
            populate: { path: 'company' },
          }],
        },
        { query: 'lean' },
      ],
      1
    );
    sinon.assert.calledOnceWithExactly(getTraineesWithElearningProgress, course.trainees, course.subProgram.steps);
  });

  it('should return course follow up with trainees from company', async () => {
    const companyId = new ObjectId();
    const course = {
      _id: '1234567890',
      subProgram: { name: 'je suis un sous programme', steps: [{ _id: 'abc' }, { _id: 'def' }, { _id: 'ghi' }] },
      trainees: [{ _id: '123213123', company: companyId }, { _id: '123213342', company: new ObjectId() }],
      slots: [{ _id: '123456789' }],
    };
    const trainees = [1, 2, 3, 4, 5];

    findOne.onCall(0).returns(SinonMongoose.stubChainedQueries({ trainees }, ['lean']));
    findOne.onCall(1).returns(SinonMongoose.stubChainedQueries(course));
    formatStep.callsFake(s => s);
    getTraineesWithElearningProgress.returns([
      { _id: '123213123', steps: { progress: 1 }, progress: 1, company: companyId },
    ]);

    const result = await CourseHelper.getCourseFollowUp(course._id, companyId);

    expect(result).toEqual({
      _id: '1234567890',
      subProgram: { name: 'je suis un sous programme', steps: [{ _id: 'abc' }, { _id: 'def' }, { _id: 'ghi' }] },
      trainees: [{ _id: '123213123', steps: { progress: 1 }, progress: 1, company: companyId }],
      slots: [{ _id: '123456789' }],
    });

    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: course._id }, { trainees: 1 }] }, { query: 'lean' }],
      0
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: course._id }, { subProgram: 1 }] },
        {
          query: 'populate',
          args: [{
            path: 'subProgram',
            select: 'name steps program',
            populate: [
              { path: 'program', select: 'name' },
              {
                path: 'steps',
                select: 'name activities type',
                populate: {
                  path: 'activities',
                  select: 'name type',
                  populate: {
                    path: 'activityHistories',
                    match: { user: { $in: trainees } },
                    populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
                  },
                },
              },
            ],
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'trainees',
            select: 'identity.firstname identity.lastname firstMobileConnection',
            populate: { path: 'company' },
          }],
        },
        { query: 'lean' },
      ],
      1
    );
    sinon.assert.calledOnceWithExactly(getTraineesWithElearningProgress, [course.trainees[0]], course.subProgram.steps);
  });
});

describe('getQuestionnaireAnswers', () => {
  let findOneCourse;
  let formatActivity;
  beforeEach(() => {
    findOneCourse = sinon.stub(Course, 'findOne');
    formatActivity = sinon.stub(CourseHelper, 'formatActivity');
  });
  afterEach(() => {
    findOneCourse.restore();
    formatActivity.restore();
  });

  it('should return questionnaire answers', async () => {
    const courseId = new ObjectId();
    const userId = new ObjectId();
    const activities = [
      { activityHistories: [{ _id: new ObjectId(), user: userId, questionnaireAnswersList: { card: {} } }] },
      { activityHistories: [{ _id: new ObjectId(), user: userId, questionnaireAnswersList: { card: {} } }] },
    ];

    const followUps = [
      { question: 'test', answers: ['1', '2'] },
      { question: 'test2', answers: ['3', '4'] },
    ];

    const course = {
      _id: courseId,
      misc: 'Groupe 3',
      trainees: [userId],
      subProgram: {
        steps: [
          { _id: new ObjectId(), program: { name: 'nom du programme' }, activities: [activities[0]] },
          { _id: new ObjectId(), program: { name: 'nom du programme' }, activities: [activities[1]] },
        ],
      },
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    formatActivity.onCall(0).returns({ followUp: [followUps[0]] });
    formatActivity.onCall(1).returns({ followUp: [followUps[1]] });

    const result = await CourseHelper.getQuestionnaireAnswers(courseId);

    expect(result).toMatchObject(followUps);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        {
          query: 'populate',
          args: [{
            path: 'subProgram',
            select: 'steps',
            populate: [{
              path: 'steps',
              select: 'activities',
              populate: {
                path: 'activities',
                populate: {
                  path: 'activityHistories',
                  populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
                },
              },
            }],
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(formatActivity.getCall(0), activities[0]);
    sinon.assert.calledWithExactly(formatActivity.getCall(1), activities[1]);
  });

  it('should return [] if no followUp', async () => {
    const courseId = new ObjectId();
    const userId = new ObjectId();
    const activities = [{ activityHistories: [] }, { activityHistories: [] }];

    const course = {
      _id: courseId,
      misc: 'Groupe 3',
      trainees: [userId],
      subProgram: {
        steps: [
          { _id: new ObjectId(), program: { name: 'nom du programme' }, activities: [activities[0]] },
          { _id: new ObjectId(), program: { name: 'nom du programme' }, activities: [activities[1]] },
        ],
      },
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    formatActivity.onCall(0).returns({ followUp: [] });
    formatActivity.onCall(1).returns({ followUp: [] });

    const result = await CourseHelper.getQuestionnaireAnswers(courseId);

    expect(result).toMatchObject([]);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        {
          query: 'populate',
          args: [{
            path: 'subProgram',
            select: 'steps',
            populate: [{
              path: 'steps',
              select: 'activities',
              populate: {
                path: 'activities',
                populate: {
                  path: 'activityHistories',
                  populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
                },
              },
            }],
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(formatActivity.getCall(0), activities[0]);
    sinon.assert.calledWithExactly(formatActivity.getCall(1), activities[1]);
  });

  it('should return [] if no step', async () => {
    const courseId = new ObjectId();
    const userId = new ObjectId();

    const course = {
      _id: courseId,
      misc: 'Groupe 3',
      trainees: [userId],
      subProgram: {},
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));

    const result = await CourseHelper.getQuestionnaireAnswers(courseId);

    expect(result).toMatchObject([]);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        {
          query: 'populate',
          args: [{
            path: 'subProgram',
            select: 'steps',
            populate: [{
              path: 'steps',
              select: 'activities',
              populate: {
                path: 'activities',
                populate: {
                  path: 'activityHistories',
                  populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
                },
              },
            }],
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(formatActivity);
  });
});

describe('getTraineesWithElearningProgress', () => {
  let getProgress;
  let getCourseProgress;
  beforeEach(() => {
    getProgress = sinon.stub(StepHelper, 'getProgress');
    getCourseProgress = sinon.stub(CourseHelper, 'getCourseProgress');
  });
  afterEach(() => {
    getProgress.restore();
    getCourseProgress.restore();
  });

  it('should return formatted steps and course progress', () => {
    const traineeId = new ObjectId();
    const otherTraineeId = new ObjectId();
    const steps = [
      {
        activities: [{ activityHistories: [{ user: traineeId }, { user: otherTraineeId }] }],
        type: ON_SITE,
      },
      {
        activities: [{ activityHistories: [{ user: traineeId }, { user: otherTraineeId }] }],
        type: E_LEARNING,
      },
    ];

    const formattedSteps = [{
      activities: [{ activityHistories: [{ user: traineeId }] }],
      type: E_LEARNING,
      progress: 1,
    }];

    getProgress.returns(1);
    getCourseProgress.returns(1);

    const result = CourseHelper.getTraineesWithElearningProgress([{ _id: traineeId }], steps);

    expect(result).toEqual([
      {
        _id: traineeId,
        steps: [{ activities: [{ activityHistories: [{ user: traineeId }] }], type: E_LEARNING, progress: 1 }],
        progress: 1,
      },
    ]);
    sinon.assert.calledOnceWithExactly(
      getProgress,
      { activities: [{ activityHistories: [{ user: traineeId }] }], type: E_LEARNING }
    );
    sinon.assert.calledOnceWithExactly(getCourseProgress, formattedSteps);
  });
});

describe('updateCourse', () => {
  let courseFindOneAndUpdate;
  let createHistoryOnEstimatedStartDateEdition;
  const credentials = { _id: new ObjectId() };
  beforeEach(() => {
    courseFindOneAndUpdate = sinon.stub(Course, 'findOneAndUpdate');
    createHistoryOnEstimatedStartDateEdition = sinon.stub(
      CourseHistoriesHelper,
      'createHistoryOnEstimatedStartDateEdition'
    );
  });
  afterEach(() => {
    courseFindOneAndUpdate.restore();
    createHistoryOnEstimatedStartDateEdition.restore();
  });

  it('should update a field in intra course', async () => {
    const courseId = new ObjectId();
    const payload = { misc: 'groupe 4' };
    const courseFromDb = { _id: courseId, misc: '' };

    courseFindOneAndUpdate.returns(SinonMongoose.stubChainedQueries(courseFromDb, ['lean']));

    await CourseHelper.updateCourse(courseId, payload, credentials);

    sinon.assert.notCalled(createHistoryOnEstimatedStartDateEdition);
    SinonMongoose.calledOnceWithExactly(
      courseFindOneAndUpdate,
      [
        { query: 'findOneAndUpdate', args: [{ _id: courseId }, { $set: payload }] },
        { query: 'lean' },
      ]
    );
  });

  it('should remove contact field in intra course', async () => {
    const courseId = new ObjectId();
    const salesRepresentativeId = new ObjectId();
    const payload = { contact: '', salesRepresentative: salesRepresentativeId };
    const courseFromDb = { _id: courseId, contact: salesRepresentativeId, salesRepresentative: salesRepresentativeId };

    courseFindOneAndUpdate.returns(SinonMongoose.stubChainedQueries(courseFromDb, ['lean']));

    await CourseHelper.updateCourse(courseId, payload, credentials);

    sinon.assert.notCalled(createHistoryOnEstimatedStartDateEdition);
    SinonMongoose.calledOnceWithExactly(
      courseFindOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: courseId }, { $set: { salesRepresentative: salesRepresentativeId }, $unset: { contact: '' } }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should update estimatedStartDate and create history', async () => {
    const courseId = new ObjectId();
    const payload = { estimatedStartDate: '2022-11-18T10:20:00.000Z' };
    const courseFromDb = { _id: courseId, estimatedStartDate: '2022-11-02T18:00:43.000Z' };

    courseFindOneAndUpdate.returns(SinonMongoose.stubChainedQueries(courseFromDb, ['lean']));

    await CourseHelper.updateCourse(courseId, payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      courseFindOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: courseId }, { $set: { estimatedStartDate: '2022-11-18T10:20:00.000Z' } }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      createHistoryOnEstimatedStartDateEdition,
      courseId,
      credentials._id,
      '2022-11-18T10:20:00.000Z',
      '2022-11-02T18:00:43.000Z'
    );
  });

  it('should update estimatedStartDate with same value and NOT create history', async () => {
    const courseId = new ObjectId();
    const payload = { estimatedStartDate: '2022-11-18T10:20:00.000Z' };
    const courseFromDb = { _id: courseId, estimatedStartDate: '2022-11-18T10:20:00.000Z' };

    courseFindOneAndUpdate.returns(SinonMongoose.stubChainedQueries(courseFromDb, ['lean']));

    await CourseHelper.updateCourse(courseId, payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      courseFindOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: courseId }, { $set: { estimatedStartDate: '2022-11-18T10:20:00.000Z' } }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(createHistoryOnEstimatedStartDateEdition);
  });
});

describe('deleteCourse', () => {
  let deleteCourse;
  let deleteCourseBill;
  let deleteCourseSmsHistory;
  let deleteCourseHistory;
  let deleteCourseSlot;
  beforeEach(() => {
    deleteCourse = sinon.stub(Course, 'deleteOne');
    deleteCourseBill = sinon.stub(CourseBill, 'deleteMany');
    deleteCourseSmsHistory = sinon.stub(CourseSmsHistory, 'deleteMany');
    deleteCourseHistory = sinon.stub(CourseHistory, 'deleteMany');
    deleteCourseSlot = sinon.stub(CourseSlot, 'deleteMany');
  });
  afterEach(() => {
    deleteCourse.restore();
    deleteCourseBill.restore();
    deleteCourseSmsHistory.restore();
    deleteCourseHistory.restore();
    deleteCourseSlot.restore();
  });

  it('should delete course and sms history', async () => {
    const courseId = new ObjectId();
    await CourseHelper.deleteCourse(courseId);

    sinon.assert.calledOnceWithExactly(deleteCourse, { _id: courseId });
    sinon.assert.calledOnceWithExactly(
      deleteCourseBill,
      { course: courseId, $or: [{ billedAt: { $exists: false } }, { billedAt: { $not: { $type: 'date' } } }] }
    );
    sinon.assert.calledOnceWithExactly(deleteCourseSmsHistory, { course: courseId });
    sinon.assert.calledOnceWithExactly(deleteCourseHistory, { course: courseId });
    sinon.assert.calledOnceWithExactly(deleteCourseSlot, { course: courseId });
  });
});

describe('sendSMS', () => {
  const courseId = new ObjectId();
  const trainees = [
    { contact: { phone: '0123456789' }, identity: { firstname: 'non', lasname: 'ok' }, _id: 'qwertyuio' },
    { contact: { phone: '0987654321' }, identity: { firstname: 'test', lasname: 'ok' }, _id: 'asdfghjkl' },
    { contact: {}, identity: { firstname: 'test', lasname: 'ko' }, _id: 'poiuytrewq' },
  ];
  const payload = { content: 'Ceci est un test.' };
  const credentials = { _id: new ObjectId() };

  let courseFindById;
  let courseSmsHistoryCreate;
  let sendStub;
  beforeEach(() => {
    courseFindById = sinon.stub(Course, 'findById');
    courseSmsHistoryCreate = sinon.stub(CourseSmsHistory, 'create');
    sendStub = sinon.stub(SmsHelper, 'send');
  });
  afterEach(() => {
    courseFindById.restore();
    courseSmsHistoryCreate.restore();
    sendStub.restore();
  });

  it('should send SMS to trainees and save missing phone trainee id', async () => {
    courseFindById.returns(SinonMongoose.stubChainedQueries({ trainees }));
    sendStub.onCall(0).returns();
    sendStub.onCall(1).returns(new Promise(() => { throw Boom.badRequest(); }));

    await CourseHelper.sendSMS(courseId, payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      courseFindById,
      [
        { query: 'findById', args: [courseId] },
        { query: 'populate', args: [{ path: 'trainees', select: '_id contact' }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      courseSmsHistoryCreate,
      {
        type: payload.type,
        course: courseId,
        message: payload.content,
        sender: credentials._id,
        missingPhones: ['poiuytrewq'],
      }
    );
    sinon.assert.calledWith(
      sendStub.getCall(0),
      {
        recipient: `+33${trainees[0].contact.phone.substring(1)}`,
        sender: 'Compani',
        content: payload.content,
        tag: COURSE_SMS,
      }
    );
    sinon.assert.calledWithExactly(
      sendStub.getCall(1),
      {
        recipient: `+33${trainees[1].contact.phone.substring(1)}`,
        sender: 'Compani',
        content: payload.content,
        tag: COURSE_SMS,
      }
    );
  });

  it('should not save coursesmshistory if no sms is sent', async () => {
    try {
      courseFindById.returns(SinonMongoose.stubChainedQueries({ trainees }));
      sendStub.returns(new Promise(() => { throw Boom.badRequest(); }));

      await CourseHelper.sendSMS(courseId, payload, credentials);

      expect(false).toBe(true);
    } catch (e) {
      sinon.assert.notCalled(courseSmsHistoryCreate);
      expect(e).toEqual(Boom.badRequest());
    }
  });

  it('should do nothing if no phone numbers', async () => {
    const traineesWithoutPhoneNumbers = [
      { contact: {}, identity: { firstname: 'non', lasname: 'ok' }, _id: 'qwertyuio' },
      { contact: {}, identity: { firstname: 'test', lasname: 'ok' }, _id: 'asdfghjkl' },
      { contact: {}, identity: { firstname: 'test', lasname: 'ko' }, _id: 'poiuytrewq' },
    ];

    courseFindById.returns(SinonMongoose.stubChainedQueries({ trainees: traineesWithoutPhoneNumbers }));

    await CourseHelper.sendSMS(courseId, payload, credentials);

    sinon.assert.notCalled(sendStub);
    sinon.assert.notCalled(courseSmsHistoryCreate);
  });
});

describe('getSMSHistory', () => {
  const courseId = new ObjectId();
  const sms = [{ type: 'convocation', message: 'Hello, this is a test' }];
  let courseSmsHistoryFind;
  beforeEach(() => {
    courseSmsHistoryFind = sinon.stub(CourseSmsHistory, 'find');
  });
  afterEach(() => {
    courseSmsHistoryFind.restore();
  });

  it('should get SMS history', async () => {
    courseSmsHistoryFind.returns(SinonMongoose.stubChainedQueries(sms));

    const result = await CourseHelper.getSMSHistory(courseId);

    expect(result).toEqual(sms);
    SinonMongoose.calledOnceWithExactly(
      courseSmsHistoryFind,
      [
        { query: 'find', args: [{ course: courseId }] },
        { query: 'populate', args: [{ path: 'sender', select: 'identity.firstname identity.lastname' }] },
        { query: 'populate', args: [{ path: 'missingPhones', select: 'identity.firstname identity.lastname' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('addTrainee', () => {
  let courseUpdateOne;
  let userFindOne;
  let createHistoryOnTraineeAddition;
  let sendBlendedCourseRegistrationNotification;
  beforeEach(() => {
    courseUpdateOne = sinon.stub(Course, 'updateOne');
    userFindOne = sinon.stub(User, 'findOne');
    createHistoryOnTraineeAddition = sinon.stub(CourseHistoriesHelper, 'createHistoryOnTraineeAddition');
    sendBlendedCourseRegistrationNotification = sinon.stub(
      NotificationHelper,
      'sendBlendedCourseRegistrationNotification'
    );
  });
  afterEach(() => {
    courseUpdateOne.restore();
    userFindOne.restore();
    createHistoryOnTraineeAddition.restore();
    sendBlendedCourseRegistrationNotification.restore();
  });

  it('should add a course trainee using existing user', async () => {
    const user = { _id: new ObjectId(), formationExpoTokenList: 'ExponentPushToken[bla]', company: new ObjectId() };
    const course = { _id: new ObjectId(), misc: 'Test' };
    const payload = { trainee: user._id };
    const credentials = { _id: new ObjectId(), company: { _id: new ObjectId() } };

    userFindOne.returns(user);
    userFindOne.returns(SinonMongoose.stubChainedQueries(user));

    await CourseHelper.addTrainee(course._id, payload, credentials);

    sinon.assert.calledOnceWithExactly(courseUpdateOne, { _id: course._id }, { $addToSet: { trainees: user._id } });
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: user._id }, { formationExpoTokenList: 1 }] },
        { query: 'populate', args: [{ path: 'company' }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      createHistoryOnTraineeAddition,
      { course: course._id, traineeId: user._id, company: user.company },
      credentials._id
    );
    sinon.assert.calledOnceWithExactly(sendBlendedCourseRegistrationNotification, user, course._id);
  });
});

describe('registerToELearningCourse', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Course, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should add a course trainee using existing user', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    await CourseHelper.registerToELearningCourse(courseId, credentials);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: courseId }, { $addToSet: { trainees: credentials._id } });
  });
});

describe('removeCourseTrainee', () => {
  let updateOne;
  let createHistoryOnTraineeDeletion;
  beforeEach(() => {
    updateOne = sinon.stub(Course, 'updateOne');
    createHistoryOnTraineeDeletion = sinon.stub(CourseHistoriesHelper, 'createHistoryOnTraineeDeletion');
  });
  afterEach(() => {
    updateOne.restore();
    createHistoryOnTraineeDeletion.restore();
  });

  it('should remove a course trainee', async () => {
    const course = new ObjectId();
    const traineeId = new ObjectId();
    const removedBy = { _id: new ObjectId() };

    await CourseHelper.removeCourseTrainee(course, traineeId, removedBy);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: course }, { $pull: { trainees: traineeId } });
    sinon.assert.calledOnceWithExactly(createHistoryOnTraineeDeletion, { course, traineeId }, removedBy._id);
  });
});

describe('formatInterCourseSlotsForPdf', () => {
  it('should format slot for pdf', () => {
    const slot = {
      startDate: '2020-03-20T09:00:00',
      endDate: '2020-03-20T11:00:00',
      address: { fullAddress: 'je suis une adress' },
    };

    const result = CourseHelper.formatInterCourseSlotsForPdf(slot);

    expect(result).toEqual({
      address: 'je suis une adress',
      date: '20/03/2020',
      startHour: '09:00',
      endHour: '11:00',
      duration: '2h',
    });
  });
});

describe('groupSlotsByDate', () => {
  it('should group slots by date', () => {
    const slots = [
      {
        startDate: '2020-03-20T09:00:00',
        endDate: '2020-03-20T11:00:00',
        address: { fullAddress: '37 rue de Ponthieu 75008 Paris' },
      },
      { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00' },
      { startDate: '2020-04-12T14:00:00', endDate: '2020-04-12T17:30:00' },
    ];

    const result = CourseHelper.groupSlotsByDate(slots);

    expect(result).toEqual([
      [{
        startDate: '2020-03-20T09:00:00',
        endDate: '2020-03-20T11:00:00',
        address: { fullAddress: '37 rue de Ponthieu 75008 Paris' },
      }], [
        { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00' },
        { startDate: '2020-04-12T14:00:00', endDate: '2020-04-12T17:30:00' },
      ],
    ]);
  });
});

describe('formatIntraCourseForPdf', () => {
  let formatIdentity;
  let getTotalDuration;
  let groupSlotsByDate;
  let formatIntraCourseSlotsForPdf;
  beforeEach(() => {
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    getTotalDuration = sinon.stub(UtilsHelper, 'getTotalDuration');
    groupSlotsByDate = sinon.stub(CourseHelper, 'groupSlotsByDate');
    formatIntraCourseSlotsForPdf = sinon.stub(CourseHelper, 'formatIntraCourseSlotsForPdf');
  });
  afterEach(() => {
    formatIdentity.restore();
    getTotalDuration.restore();
    groupSlotsByDate.restore();
    formatIntraCourseSlotsForPdf.restore();
  });

  it('should format course for pdf', () => {
    const course = {
      misc: 'des infos en plus',
      trainer: { identity: { lastname: 'MasterClass' } },
      subProgram: { program: { name: 'programme' } },
      slots: [
        {
          startDate: '2020-03-20T09:00:00',
          endDate: '2020-03-20T11:00:00',
          address: { fullAddress: '37 rue de Ponthieu 75008 Paris' },
          step: { type: 'on_site' },
        },
        { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00', step: { type: 'on_site' } },
        { startDate: '2020-04-12T14:00:00', endDate: '2020-04-12T17:30:00', step: { type: 'on_site' } },
        { startDate: '2020-04-14T18:00:00', endDate: '2020-04-14T19:30:00', step: { type: 'remote' } },
      ],
      companies: [{ name: 'alenvi' }],
    };

    getTotalDuration.returns('8h');
    formatIdentity.returns('MasterClass');
    groupSlotsByDate.returns([[{
      startDate: '2020-03-20T09:00:00',
      endDate: '2020-03-20T11:00:00',
      address: { fullAddress: '37 rue de Ponthieu 75008 Paris' },
      step: { type: 'on_site' },
    }], [
      { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00', step: { type: 'on_site' } },
      { startDate: '2020-04-12T14:00:00', endDate: '2020-04-12T17:30:00', step: { type: 'on_site' } },
    ]]);
    formatIntraCourseSlotsForPdf.onCall(0).returns({ startHour: 'slot1' });
    formatIntraCourseSlotsForPdf.onCall(1).returns({ startHour: 'slot2' });
    formatIntraCourseSlotsForPdf.onCall(2).returns({ startHour: 'slot3' });

    const result = CourseHelper.formatIntraCourseForPdf(course);

    expect(result).toEqual({
      dates: [{
        course: { name: 'programme - des infos en plus', duration: '8h', company: 'alenvi', trainer: 'MasterClass' },
        address: '37 rue de Ponthieu 75008 Paris',
        slots: [{ startHour: 'slot1' }],
        date: '20/03/2020',
      }, {
        course: { name: 'programme - des infos en plus', duration: '8h', company: 'alenvi', trainer: 'MasterClass' },
        address: '',
        slots: [{ startHour: 'slot2' }, { startHour: 'slot3' }],
        date: '12/04/2020',
      }],
    });
    sinon.assert.calledOnceWithExactly(getTotalDuration, course.slots);
    sinon.assert.calledOnceWithExactly(formatIdentity, { lastname: 'MasterClass' }, 'FL');
    sinon.assert.calledOnceWithExactly(groupSlotsByDate, [
      {
        startDate: '2020-03-20T09:00:00',
        endDate: '2020-03-20T11:00:00',
        address: { fullAddress: '37 rue de Ponthieu 75008 Paris' },
        step: { type: 'on_site' },
      },
      { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00', step: { type: 'on_site' } },
      { startDate: '2020-04-12T14:00:00', endDate: '2020-04-12T17:30:00', step: { type: 'on_site' } },
    ]);
    sinon.assert.calledWithExactly(formatIntraCourseSlotsForPdf.getCall(0), course.slots[0]);
    sinon.assert.calledWithExactly(formatIntraCourseSlotsForPdf.getCall(1), course.slots[1]);
    sinon.assert.calledWithExactly(formatIntraCourseSlotsForPdf.getCall(2), course.slots[2]);
    sinon.assert.callCount(formatIntraCourseSlotsForPdf, 3);
  });
});

describe('formatInterCourseForPdf', () => {
  let formatIdentity;
  let getTotalDuration;
  let formatInterCourseSlotsForPdf;
  beforeEach(() => {
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    getTotalDuration = sinon.stub(UtilsHelper, 'getTotalDuration');
    formatInterCourseSlotsForPdf = sinon.stub(CourseHelper, 'formatInterCourseSlotsForPdf');
  });
  afterEach(() => {
    formatIdentity.restore();
    getTotalDuration.restore();
    formatInterCourseSlotsForPdf.restore();
  });

  it('should format course for pdf', () => {
    const course = {
      slots: [
        { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00', step: { type: 'on_site' } },
        { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:30:00', step: { type: 'on_site' } },
        { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00', step: { type: 'on_site' } },
        { startDate: '2020-04-12T09:00:00', endDate: '2020-04-15T11:30:00', step: { type: 'remote' } },
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
      { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00', step: { type: 'on_site' } },
      { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00', step: { type: 'on_site' } },
      { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:30:00', step: { type: 'on_site' } },
    ];
    formatInterCourseSlotsForPdf.returns('slot');
    formatIdentity.onCall(0).returns('Pere Castor');
    formatIdentity.onCall(1).returns('trainee 1');
    formatIdentity.onCall(2).returns('trainee 2');
    getTotalDuration.returns('7h');

    const result = CourseHelper.formatInterCourseForPdf(course);

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
    sinon.assert.calledOnceWithExactly(getTotalDuration, sortedSlots);
    sinon.assert.callCount(formatInterCourseSlotsForPdf, 3);
  });
});

describe('generateAttendanceSheets', () => {
  let courseFindOne;
  let formatInterCourseForPdf;
  let formatIntraCourseForPdf;
  let generatePdf;
  let interAttendanceSheetGetPdf;
  let intraAttendanceSheetGetPdf;
  beforeEach(() => {
    courseFindOne = sinon.stub(Course, 'findOne');
    formatInterCourseForPdf = sinon.stub(CourseHelper, 'formatInterCourseForPdf');
    formatIntraCourseForPdf = sinon.stub(CourseHelper, 'formatIntraCourseForPdf');
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
    interAttendanceSheetGetPdf = sinon.stub(InterAttendanceSheet, 'getPdf');
    intraAttendanceSheetGetPdf = sinon.stub(IntraAttendanceSheet, 'getPdf');
  });
  afterEach(() => {
    courseFindOne.restore();
    formatInterCourseForPdf.restore();
    formatIntraCourseForPdf.restore();
    generatePdf.restore();
    interAttendanceSheetGetPdf.restore();
    intraAttendanceSheetGetPdf.restore();
  });

  it('should download attendance sheet for inter b2b course', async () => {
    const courseId = new ObjectId();
    const course = { misc: 'des infos en plus', type: INTER_B2B };

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));

    formatInterCourseForPdf.returns({ name: 'la formation - des infos en plus' });
    interAttendanceSheetGetPdf.returns('pdf');

    await CourseHelper.generateAttendanceSheets(courseId);

    SinonMongoose.calledOnceWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }, { misc: 1, type: 1 }] },
      { query: 'populate', args: [{ path: 'companies', select: 'name' }] },
      {
        query: 'populate',
        args: [{ path: 'slots', select: 'step startDate endDate address', populate: { path: 'step', select: 'type' } }],
      },
      {
        query: 'populate',
        args: [{
          path: 'trainees',
          select: 'identity company',
          populate: { path: 'company', populate: { path: 'company', select: 'name' } },
        }],
      },
      { query: 'populate', args: [{ path: 'trainer', select: 'identity' }] },
      {
        query: 'populate',
        args: [{ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } }],
      },
      { query: 'lean' },
    ]);
    sinon.assert.calledOnceWithExactly(formatInterCourseForPdf, course);
    sinon.assert.notCalled(formatIntraCourseForPdf);
    sinon.assert.notCalled(intraAttendanceSheetGetPdf);
    sinon.assert.calledOnceWithExactly(interAttendanceSheetGetPdf, { name: 'la formation - des infos en plus' });
  });

  it('should download attendance sheet for intra course', async () => {
    const courseId = new ObjectId();
    const course = { misc: 'des infos en plus', type: INTRA };

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));

    formatIntraCourseForPdf.returns({ name: 'la formation - des infos en plus' });
    intraAttendanceSheetGetPdf.returns('pdf');

    await CourseHelper.generateAttendanceSheets(courseId);

    SinonMongoose.calledOnceWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }, { misc: 1, type: 1 }] },
      { query: 'populate', args: [{ path: 'companies', select: 'name' }] },
      {
        query: 'populate',
        args: [{ path: 'slots', select: 'step startDate endDate address', populate: { path: 'step', select: 'type' } }],
      },
      {
        query: 'populate',
        args: [{
          path: 'trainees',
          select: 'identity company',
          populate: { path: 'company', populate: { path: 'company', select: 'name' } },
        }],
      },
      { query: 'populate', args: [{ path: 'trainer', select: 'identity' }] },
      {
        query: 'populate',
        args: [{ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } }],
      },
      { query: 'lean' },
    ]);
    sinon.assert.calledOnceWithExactly(formatIntraCourseForPdf, course);
    sinon.assert.notCalled(formatInterCourseForPdf);
    sinon.assert.calledOnceWithExactly(intraAttendanceSheetGetPdf, { name: 'la formation - des infos en plus' });
  });
});

describe('formatCourseForDocuments', () => {
  let getTotalDuration;
  beforeEach(() => {
    getTotalDuration = sinon.stub(UtilsHelper, 'getTotalDuration');
  });
  afterEach(() => {
    getTotalDuration.restore();
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
    getTotalDuration.returns('7h');

    const result = CourseHelper.formatCourseForDocuments(course);

    expect(result).toEqual({
      duration: '7h',
      learningGoals: 'Apprendre',
      startDate: '20/03/2020',
      endDate: '21/04/2020',
      programName: 'NOM DU PROGRAMME',
    });
    sinon.assert.calledOnceWithExactly(
      getTotalDuration,
      [
        { startDate: '2020-03-20T09:00:00', endDate: '2020-03-20T11:00:00' },
        { startDate: '2020-04-12T09:00:00', endDate: '2020-04-12T11:30:00' },
        { startDate: '2020-04-21T09:00:00', endDate: '2020-04-21T11:30:00' },
      ]
    );
  });
});

describe('generateCompletionCertificate', () => {
  let courseFindOne;
  let attendanceFind;
  let formatCourseForDocuments;
  let formatIdentity;
  let getTotalDuration;
  let createDocx;
  let generateZip;
  let createReadStream;
  let downloadFileById;
  let tmpDir;
  let getPdf;
  beforeEach(() => {
    courseFindOne = sinon.stub(Course, 'findOne');
    attendanceFind = sinon.stub(Attendance, 'find');
    formatCourseForDocuments = sinon.stub(CourseHelper, 'formatCourseForDocuments');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    getTotalDuration = sinon.stub(UtilsHelper, 'getTotalDuration');
    createDocx = sinon.stub(DocxHelper, 'createDocx');
    generateZip = sinon.stub(ZipHelper, 'generateZip');
    UtilsMock.mockCurrentDate('2020-01-20T07:00:00.000Z');
    createReadStream = sinon.stub(fs, 'createReadStream');
    downloadFileById = sinon.stub(Drive, 'downloadFileById');
    tmpDir = sinon.stub(os, 'tmpdir').returns('/path');
    getPdf = sinon.stub(CompletionCertificate, 'getPdf');
  });
  afterEach(() => {
    courseFindOne.restore();
    attendanceFind.restore();
    formatCourseForDocuments.restore();
    formatIdentity.restore();
    getTotalDuration.restore();
    createDocx.restore();
    generateZip.restore();
    UtilsMock.unmockCurrentDate();
    createReadStream.restore();
    downloadFileById.restore();
    tmpDir.restore();
    getPdf.restore();
  });

  it('should download completion certificates from webapp (vendor)', async () => {
    const companyId = new ObjectId();
    const credentials = {
      _id: new ObjectId(),
      role: { vendor: { name: 'vendor_admin' } },
      company: { _id: companyId },
    };
    const courseId = new ObjectId();
    const readable1 = new PassThrough();
    const readable2 = new PassThrough();
    const readable3 = new PassThrough();
    const traineeId1 = new ObjectId();
    const traineeId2 = new ObjectId();
    const traineeId3 = new ObjectId();
    const course = {
      trainees: [
        { _id: traineeId1, identity: { lastname: 'trainee 1' }, company: new ObjectId() },
        { _id: traineeId2, identity: { lastname: 'trainee 2' }, company: new ObjectId() },
        { _id: traineeId3, identity: { lastname: 'trainee 3' }, company: new ObjectId() },
      ],
      misc: 'Bonjour je suis une formation',
      slots: [{ _id: new ObjectId() }, { _id: new ObjectId() }],
      trainer: new ObjectId(),
      companies: [companyId],
    };
    const attendances = [
      {
        trainee: traineeId1,
        courseSlot: { startDate: '2022-01-18T07:00:00.000Z', endDate: '2022-01-18T10:00:00.000Z' },
      },
      {
        trainee: traineeId1,
        courseSlot: { startDate: '2022-01-21T12:00:00.000Z', endDate: '2022-01-21T13:30:00.000Z' },
      },
      {
        trainee: traineeId2,
        courseSlot: { startDate: '2022-01-18T07:00:00.000Z', endDate: '2022-01-18T10:00:00.000Z' },
      },
    ];

    attendanceFind.returns(SinonMongoose.stubChainedQueries(attendances, ['populate', 'setOptions', 'lean']));
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));
    formatCourseForDocuments.returns({
      program: { learningGoals: 'Apprendre', name: 'nom du programme' },
      courseDuration: '8h',
    });
    createDocx.onCall(0).returns('1.docx');
    createDocx.onCall(1).returns('2.docx');
    createDocx.onCall(2).returns('3.docx');
    formatIdentity.onCall(0).returns('trainee 1');
    formatIdentity.onCall(1).returns('trainee 2');
    formatIdentity.onCall(2).returns('trainee 3');
    getTotalDuration.onCall(0).returns('4h30');
    getTotalDuration.onCall(1).returns('3h');
    getTotalDuration.onCall(2).returns('0h');
    createReadStream.onCall(0).returns(readable1);
    createReadStream.onCall(1).returns(readable2);
    createReadStream.onCall(2).returns(readable3);

    await CourseHelper.generateCompletionCertificates(courseId, credentials);

    sinon.assert.calledOnceWithExactly(formatCourseForDocuments, course);
    sinon.assert.calledWithExactly(formatIdentity.getCall(0), { lastname: 'trainee 1' }, 'FL');
    sinon.assert.calledWithExactly(formatIdentity.getCall(1), { lastname: 'trainee 2' }, 'FL');
    sinon.assert.calledWithExactly(formatIdentity.getCall(2), { lastname: 'trainee 3' }, 'FL');
    sinon.assert.calledWithExactly(
      getTotalDuration.getCall(0),
      [attendances[0].courseSlot, attendances[1].courseSlot]
    );
    sinon.assert.calledWithExactly(getTotalDuration.getCall(1), [attendances[2].courseSlot]);
    sinon.assert.calledWithExactly(getTotalDuration.getCall(2), []);
    sinon.assert.calledWithExactly(
      createDocx.getCall(0),
      '/path/certificate_template.docx',
      {
        program: { learningGoals: 'Apprendre', name: 'nom du programme' },
        courseDuration: '8h',
        trainee: { identity: 'trainee 1', attendanceDuration: '4h30' },
        date: '20/01/2020',
      }
    );
    sinon.assert.calledWithExactly(
      createDocx.getCall(1),
      '/path/certificate_template.docx',
      {
        program: { learningGoals: 'Apprendre', name: 'nom du programme' },
        courseDuration: '8h',
        trainee: { identity: 'trainee 2', attendanceDuration: '3h' },
        date: '20/01/2020',
      }
    );
    sinon.assert.calledWithExactly(
      createDocx.getCall(2),
      '/path/certificate_template.docx',
      {
        program: { learningGoals: 'Apprendre', name: 'nom du programme' },
        courseDuration: '8h',
        trainee: { identity: 'trainee 3', attendanceDuration: '0h' },
        date: '20/01/2020',
      }
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
    sinon.assert.calledOnceWithExactly(
      downloadFileById,
      {
        fileId: process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID,
        tmpFilePath: '/path/certificate_template.docx',
      }
    );
    SinonMongoose.calledOnceWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }] },
      { query: 'populate', args: [{ path: 'slots', select: 'startDate endDate' }] },
      { query: 'populate', args: [{ path: 'trainees', select: 'identity', populate: { path: 'company' } }] },
      {
        query: 'populate',
        args: [{
          path: 'subProgram',
          select: 'program',
          populate: { path: 'program', select: 'name learningGoals' },
        }],
      },
      { query: 'lean' },
    ]);
    SinonMongoose.calledOnceWithExactly(
      attendanceFind,
      [
        { query: 'find', args: [{ courseSlot: course.slots.map(s => s._id), company: { $in: course.companies } }] },
        { query: 'populate', args: [{ path: 'courseSlot', select: 'startDate endDate' }] },
        { query: 'setOptions', args: [{ isVendorUser: VENDOR_ROLES.includes(get(credentials, 'role.vendor.name')) }] },
        { query: 'lean' },
      ]);
    sinon.assert.notCalled(getPdf);
  });

  it('should download completion certificates from webapp (client)', async () => {
    const companyId = new ObjectId();
    const credentials = { _id: new ObjectId(), role: { client: 'admin' }, company: { _id: companyId } };
    const courseId = new ObjectId();
    const readable1 = new PassThrough();
    const traineeId1 = new ObjectId();
    const traineeId2 = new ObjectId();
    const traineeId3 = new ObjectId();
    const course = {
      trainees: [
        { _id: traineeId1, identity: { lastname: 'trainee 1' }, company: companyId },
        { _id: traineeId2, identity: { lastname: 'trainee 2' }, company: new ObjectId() },
        { _id: traineeId3, identity: { lastname: 'trainee 3' }, company: new ObjectId() },
      ],
      misc: 'Bonjour je suis une formation',
      slots: [{ _id: new ObjectId() }, { _id: new ObjectId() }],
      companies: [companyId],
    };
    const attendances = [
      {
        trainee: traineeId1,
        courseSlot: { startDate: '2022-01-18T07:00:00.000Z', endDate: '2022-01-18T10:00:00.000Z' },
      },
      {
        trainee: traineeId1,
        courseSlot: { startDate: '2022-01-21T12:00:00.000Z', endDate: '2022-01-21T13:30:00.000Z' },
      },
      {
        trainee: traineeId2,
        courseSlot: { startDate: '2022-01-18T07:00:00.000Z', endDate: '2022-01-18T10:00:00.000Z' },
      },
    ];

    attendanceFind.returns(SinonMongoose.stubChainedQueries(attendances, ['populate', 'setOptions', 'lean']));
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));
    formatCourseForDocuments.returns({
      program: { learningGoals: 'Apprendre', name: 'nom du programme' },
      courseDuration: '8h',
    });
    createDocx.returns('1.docx');
    formatIdentity.returns('trainee 1');
    getTotalDuration.returns('4h30');
    createReadStream.returns(readable1);

    await CourseHelper.generateCompletionCertificates(courseId, credentials);

    sinon.assert.calledOnceWithExactly(formatCourseForDocuments, course);
    sinon.assert.calledOnceWithExactly(formatIdentity, { lastname: 'trainee 1' }, 'FL');
    sinon.assert.calledOnceWithExactly(getTotalDuration, [attendances[0].courseSlot, attendances[1].courseSlot]);
    sinon.assert.calledOnceWithExactly(
      createDocx,
      '/path/certificate_template.docx',
      {
        program: { learningGoals: 'Apprendre', name: 'nom du programme' },
        courseDuration: '8h',
        trainee: { identity: 'trainee 1', attendanceDuration: '4h30' },
        date: '20/01/2020',
      }
    );
    sinon.assert.calledOnceWithExactly(
      generateZip,
      'attestations.zip',
      [{ name: 'Attestation - trainee 1.docx', file: readable1 }]
    );
    sinon.assert.calledOnceWithExactly(createReadStream, '1.docx');
    sinon.assert.calledOnceWithExactly(
      downloadFileById,
      {
        fileId: process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID,
        tmpFilePath: '/path/certificate_template.docx',
      }
    );
    SinonMongoose.calledOnceWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }] },
      { query: 'populate', args: [{ path: 'slots', select: 'startDate endDate' }] },
      { query: 'populate', args: [{ path: 'trainees', select: 'identity', populate: { path: 'company' } }] },
      {
        query: 'populate',
        args: [{
          path: 'subProgram',
          select: 'program',
          populate: { path: 'program', select: 'name learningGoals' },
        }],
      },
      { query: 'lean' },
    ]);
    SinonMongoose.calledOnceWithExactly(
      attendanceFind,
      [
        { query: 'find', args: [{ courseSlot: course.slots.map(s => s._id), company: { $in: course.companies } }] },
        { query: 'populate', args: [{ path: 'courseSlot', select: 'startDate endDate' }] },
        { query: 'setOptions', args: [{ isVendorUser: VENDOR_ROLES.includes(get(credentials, 'role.vendor.name')) }] },
        { query: 'lean' },
      ]);
    sinon.assert.notCalled(getPdf);
  });

  it('should download completion certificates from mobile', async () => {
    const companyId = new ObjectId();

    const credentials = { _id: new ObjectId(), company: { _id: companyId } };
    const courseId = new ObjectId();
    const traineeId1 = credentials._id;
    const traineeId2 = new ObjectId();
    const traineeId3 = new ObjectId();
    const course = {
      trainees: [
        { _id: traineeId1, identity: { lastname: 'trainee 1' }, company: new ObjectId() },
        { _id: traineeId2, identity: { lastname: 'trainee 2' }, company: new ObjectId() },
        { _id: traineeId3, identity: { lastname: 'trainee 3' }, company: new ObjectId() },
      ],
      misc: 'Bonjour je suis une formation',
      slots: [{ _id: new ObjectId() }, { _id: new ObjectId() }],
      companies: [companyId],
    };
    const attendances = [
      {
        trainee: traineeId1,
        courseSlot: { startDate: '2022-01-18T07:00:00.000Z', endDate: '2022-01-18T10:00:00.000Z' },
      },
      {
        trainee: traineeId1,
        courseSlot: { startDate: '2022-01-21T12:00:00.000Z', endDate: '2022-01-21T13:30:00.000Z' },
      },
      {
        trainee: traineeId2,
        courseSlot: { startDate: '2022-01-18T07:00:00.000Z', endDate: '2022-01-18T10:00:00.000Z' },
      },
    ];

    const courseData = {
      program: { learningGoals: 'Apprendre', name: 'nom du programme' },
      courseDuration: '8h',
    };

    attendanceFind.returns(SinonMongoose.stubChainedQueries(attendances, ['populate', 'setOptions', 'lean']));
    courseFindOne.returns(SinonMongoose.stubChainedQueries(course));
    formatCourseForDocuments.returns(courseData);
    formatIdentity.onCall(0).returns('trainee 1');
    getTotalDuration.onCall(0).returns('4h30');
    getPdf.returns('pdf');

    const result = await CourseHelper.generateCompletionCertificates(courseId, credentials, MOBILE);

    expect(result).toEqual({ pdf: 'pdf', name: 'Attestation - trainee 1.pdf' });
    sinon.assert.calledOnceWithExactly(formatCourseForDocuments, course);
    sinon.assert.calledOnceWithExactly(formatIdentity, { lastname: 'trainee 1' }, 'FL');
    sinon.assert.calledOnceWithExactly(getTotalDuration, [attendances[0].courseSlot, attendances[1].courseSlot]);
    sinon.assert.calledOnceWithExactly(getPdf, {
      ...courseData,
      trainee: { identity: 'trainee 1', attendanceDuration: '4h30' },
      date: '20/01/2020',
    });
    SinonMongoose.calledOnceWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }] },
      { query: 'populate', args: [{ path: 'slots', select: 'startDate endDate' }] },
      { query: 'populate', args: [{ path: 'trainees', select: 'identity', populate: { path: 'company' } }] },
      {
        query: 'populate',
        args: [{
          path: 'subProgram',
          select: 'program',
          populate: { path: 'program', select: 'name learningGoals' },
        }],
      },
      { query: 'lean' },
    ]);

    SinonMongoose.calledOnceWithExactly(
      attendanceFind,
      [
        { query: 'find', args: [{ courseSlot: course.slots.map(s => s._id), company: { $in: course.companies } }] },
        { query: 'populate', args: [{ path: 'courseSlot', select: 'startDate endDate' }] },
        { query: 'setOptions', args: [{ isVendorUser: VENDOR_ROLES.includes(get(credentials, 'role.vendor.name')) }] },
        { query: 'lean' },
      ]);
    sinon.assert.notCalled(createDocx);
    sinon.assert.notCalled(createReadStream);
    sinon.assert.notCalled(generateZip);
    sinon.assert.notCalled(downloadFileById);
  });
});

describe('addAccessRule', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Course, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should add access rule to course', async () => {
    const courseId = new ObjectId();
    const payload = { company: new ObjectId() };

    await CourseHelper.addAccessRule(courseId, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: courseId }, { $push: { accessRules: payload.company } });
  });
});

describe('deleteAccessRule', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Course, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should add access rule to course', async () => {
    const courseId = new ObjectId();
    const accessRuleId = new ObjectId();

    await CourseHelper.deleteAccessRule(courseId, accessRuleId);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: courseId }, { $pull: { accessRules: accessRuleId } });
  });
});

describe('formatHoursForConvocation', () => {
  it('should format hours for convocation for 1 slot', () => {
    const slots = [{ startDate: '2020-10-12T12:30:00', endDate: '2020-10-12T14:30:00' }];

    const result = CourseHelper.formatHoursForConvocation(slots);

    expect(result).toEqual('12h30 - 14h30');
  });

  it('should format hours for convocation for 2 slots', () => {
    const slots = [
      { startDate: '2020-10-12T12:30:00', endDate: '2020-10-12T14:30:00' },
      { startDate: '2020-10-12T15:30:00', endDate: '2020-10-12T17:30:00' },
    ];

    const result = CourseHelper.formatHoursForConvocation(slots);

    expect(result).toEqual('12h30 - 14h30 / 15h30 - 17h30');
  });
});

describe('formatCourseForConvocationPdf', () => {
  let formatIdentity;
  let formatHoursForConvocation;
  let groupSlotsByDate;
  beforeEach(() => {
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    formatHoursForConvocation = sinon.stub(CourseHelper, 'formatHoursForConvocation');
    groupSlotsByDate = sinon.stub(CourseHelper, 'groupSlotsByDate');
  });
  afterEach(() => {
    formatIdentity.restore();
    formatHoursForConvocation.restore();
    groupSlotsByDate.restore();
  });

  it('should return formatted course', async () => {
    const courseId = new ObjectId();
    const course = {
      _id: courseId,
      subProgram: { program: { name: 'Comment attraper des Pokemons' } },
      trainer: { identity: { firstname: 'Ash', lastname: 'Ketchum' } },
      contact: {
        identity: { firstname: 'Pika', lastname: 'CHU' },
        contact: { phone: '0123456789' },
        local: { email: 'pikachu@coucou.fr' },
      },
      slots: [
        {
          startDate: '2020-10-12T12:30:00',
          endDate: '2020-10-12T13:30:00',
          address: { fullAddress: '3 rue T' },
        },
        {
          startDate: '2020-10-14T17:30:00',
          endDate: '2020-10-14T19:30:00',
          meetingLink: 'http://eelslap.com/',
        },
      ],
    };

    formatIdentity.onCall(0).returns('Pika Chu');
    formatIdentity.onCall(1).returns('Ash Ketchum');
    formatHoursForConvocation.onCall(0).returns('13:30 - 14:30');
    formatHoursForConvocation.onCall(1).returns('18:30 - 20:30');
    groupSlotsByDate.returns([
      [{
        startDate: '2020-10-12T12:30:00',
        endDate: '2020-10-12T13:30:00',
        address: { fullAddress: '3 rue T' },
      }],
      [{
        startDate: '2020-10-14T17:30:00',
        endDate: '2020-10-14T19:30:00',
        meetingLink: 'http://eelslap.com/',
      }],
    ]);

    const result = await CourseHelper.formatCourseForConvocationPdf(course);

    expect(result).toEqual({
      _id: courseId,
      subProgram: { program: { name: 'Comment attraper des Pokemons' } },
      trainer: { identity: { firstname: 'Ash', lastname: 'Ketchum' }, formattedIdentity: 'Ash Ketchum' },
      contact: { formattedIdentity: 'Pika Chu', formattedPhone: '01 23 45 67 89', email: 'pikachu@coucou.fr' },
      slots: [
        { date: '12/10/2020', hours: '13:30 - 14:30', address: '3 rue T' },
        { date: '14/10/2020', hours: '18:30 - 20:30', meetingLink: 'http://eelslap.com/' },
      ],
    });

    sinon.assert.calledWithExactly(formatIdentity.getCall(0), { firstname: 'Pika', lastname: 'CHU' }, 'FL');
    sinon.assert.calledWithExactly(formatIdentity.getCall(1), { firstname: 'Ash', lastname: 'Ketchum' }, 'FL');
    sinon.assert.calledWithExactly(
      formatHoursForConvocation.getCall(0),
      [{ startDate: '2020-10-12T12:30:00', endDate: '2020-10-12T13:30:00', address: { fullAddress: '3 rue T' } }]
    );
    sinon.assert.calledWithExactly(
      formatHoursForConvocation.getCall(1),
      [{ startDate: '2020-10-14T17:30:00', endDate: '2020-10-14T19:30:00', meetingLink: 'http://eelslap.com/' }]
    );
  });
});

describe('generateConvocationPdf', () => {
  let formatCourseForConvocationPdf;
  let courseFindOne;
  let getPdf;
  beforeEach(() => {
    formatCourseForConvocationPdf = sinon.stub(CourseHelper, 'formatCourseForConvocationPdf');
    courseFindOne = sinon.stub(Course, 'findOne');
    getPdf = sinon.stub(CourseConvocation, 'getPdf');
  });
  afterEach(() => {
    formatCourseForConvocationPdf.restore();
    courseFindOne.restore();
    getPdf.restore();
  });

  it('should return pdf', async () => {
    const courseId = new ObjectId();

    courseFindOne.returns(SinonMongoose.stubChainedQueries(
      {
        _id: courseId,
        subProgram: { program: { name: 'Comment attraper des Pokemons' } },
        trainer: { identity: { firstname: 'Ash', lastname: 'Ketchum' } },
        contact: { phone: '0123456789' },
        slots: [{
          startDate: '2020-10-12T12:30:00.000+01:00',
          endDate: '2020-10-12T13:30:00.000+01:00',
          address: { fullAddress: '37 rue de Ponthieu 75005 Paris' },
        }],
      }
    ));

    formatCourseForConvocationPdf.returns({
      _id: courseId,
      subProgram: { program: { name: 'Comment attraper des Pokemons' } },
      trainer: { identity: { firstname: 'Ash', lastname: 'Ketchum' } },
      trainerIdentity: 'Ash Ketchum',
      contact: { phone: '0123456789' },
      contactPhoneNumber: '01 23 45 67 89',
      slots: [{
        startDay: '12 oct. 2020',
        hours: '13:30 - 14:30',
        address: { fullAddress: '37 rue de Ponthieu 75005 Paris' },
        length: 1,
        position: 1,
      }],
    });

    getPdf.returns('pdf');

    const result = await CourseHelper.generateConvocationPdf(courseId);

    expect(result).toEqual({ pdf: 'pdf', courseName: 'Comment-attraper-des-Pokemons' });
    SinonMongoose.calledOnceWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }, { misc: 1 }] },
      {
        query: 'populate',
        args: [{
          path: 'subProgram',
          select: 'program',
          populate: { path: 'program', select: 'name description' },
        }],
      },
      { query: 'populate', args: [{ path: 'slots', select: 'startDate endDate address meetingLink' }] },
      { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
      {
        query: 'populate',
        args: [{ path: 'contact', select: 'identity.firstname identity.lastname contact.phone local.email' }],
      },
      { query: 'populate', args: [{ path: 'trainer', select: 'identity.firstname identity.lastname biography' }] },
      { query: 'lean' },
    ]);
    sinon.assert.calledOnceWithExactly(
      formatCourseForConvocationPdf,
      {
        _id: courseId,
        subProgram: { program: { name: 'Comment attraper des Pokemons' } },
        trainer: { identity: { firstname: 'Ash', lastname: 'Ketchum' } },
        contact: { phone: '0123456789' },
        slots: [{
          startDate: '2020-10-12T12:30:00.000+01:00',
          endDate: '2020-10-12T13:30:00.000+01:00',
          address: { fullAddress: '37 rue de Ponthieu 75005 Paris' },
        }],
      }
    );
    sinon.assert.calledOnceWithExactly(
      getPdf,
      {
        _id: courseId,
        subProgram: { program: { name: 'Comment attraper des Pokemons' } },
        trainer: { identity: { firstname: 'Ash', lastname: 'Ketchum' } },
        trainerIdentity: 'Ash Ketchum',
        contact: { phone: '0123456789' },
        contactPhoneNumber: '01 23 45 67 89',
        slots: [{
          startDay: '12 oct. 2020',
          hours: '13:30 - 14:30',
          address: { fullAddress: '37 rue de Ponthieu 75005 Paris' },
          length: 1,
          position: 1,
        }],
      }
    );
  });
});

describe('getQuestionnaires', () => {
  let findQuestionnaire;
  beforeEach(() => {
    findQuestionnaire = sinon.stub(Questionnaire, 'find');
  });
  afterEach(() => {
    findQuestionnaire.restore();
  });

  it('should return questionnaires with answers', async () => {
    const courseId = new ObjectId();
    const questionnaires = [
      { name: 'test', type: 'expectations', historiesCount: 1 },
      { name: 'test2', type: 'expectations', historiesCount: 0 },
    ];

    findQuestionnaire.returns(SinonMongoose.stubChainedQueries(questionnaires, ['select', 'populate', 'lean']));

    const result = await CourseHelper.getQuestionnaires(courseId);

    expect(result).toMatchObject([questionnaires[0]]);
    SinonMongoose.calledOnceWithExactly(
      findQuestionnaire,
      [
        { query: 'find', args: [{ status: { $ne: DRAFT } }] },
        { query: 'select', args: ['type name'] },
        {
          query: 'populate',
          args: [{ path: 'historiesCount', match: { course: courseId, questionnaireAnswersList: { $ne: [] } } }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('addCourseCompany', () => {
  let courseUpdateOne;
  let createHistoryOnCompanyAddition;
  beforeEach(() => {
    courseUpdateOne = sinon.stub(Course, 'updateOne');
    createHistoryOnCompanyAddition = sinon.stub(CourseHistoriesHelper, 'createHistoryOnCompanyAddition');
  });
  afterEach(() => {
    courseUpdateOne.restore();
    createHistoryOnCompanyAddition.restore();
  });

  it('should add a course company using existing company', async () => {
    const companyId = new ObjectId();
    const course = { _id: new ObjectId(), misc: 'Test', companies: [new ObjectId()] };
    const payload = { company: companyId };
    const credentials = { _id: new ObjectId() };

    await CourseHelper.addCourseCompany(course._id, payload, credentials);

    sinon.assert.calledOnceWithExactly(courseUpdateOne, { _id: course._id }, { $addToSet: { companies: companyId } });
    sinon.assert.calledOnceWithExactly(
      createHistoryOnCompanyAddition,
      { course: course._id, company: companyId },
      credentials._id
    );
  });
});

describe('removeCourseCompany', () => {
  let courseUpdateOne;
  let createHistoryOnCompanyDeletion;

  beforeEach(() => {
    courseUpdateOne = sinon.stub(Course, 'updateOne');
    createHistoryOnCompanyDeletion = sinon.stub(CourseHistoriesHelper, 'createHistoryOnCompanyDeletion');
  });

  afterEach(() => {
    courseUpdateOne.restore();
    createHistoryOnCompanyDeletion.restore();
  });

  it('should remove a course company', async () => {
    const companyId = new ObjectId();
    const course = { _id: new ObjectId(), misc: 'Test', companies: [companyId, new ObjectId()] };
    const credentials = { _id: new ObjectId() };

    await CourseHelper.removeCourseCompany(course._id, companyId, credentials);

    sinon.assert.calledOnceWithExactly(courseUpdateOne, { _id: course._id }, { $pull: { companies: companyId } });
    sinon.assert.calledOnceWithExactly(
      createHistoryOnCompanyDeletion,
      { course: course._id, company: companyId },
      credentials._id
    );
  });
});
