const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const fs = require('fs');
const os = require('os');
const { PassThrough } = require('stream');
const { fn: momentProto } = require('moment');
const moment = require('moment');
const Boom = require('@hapi/boom');
const Course = require('../../../src/models/Course');
const User = require('../../../src/models/User');
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
const { COURSE_SMS, BLENDED, DRAFT, E_LEARNING, ON_SITE } = require('../../../src/helpers/constants');
const CourseRepository = require('../../../src/repositories/CourseRepository');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');
const SinonMongoose = require('../sinonMongoose');
const InterAttendanceSheet = require('../../../src/data/pdf/attendanceSheet/interAttendanceSheet');
const IntraAttendanceSheet = require('../../../src/data/pdf/attendanceSheet/intraAttendanceSheet');
const CourseConvocation = require('../../../src/data/pdf/courseConvocation');

describe('createCourse', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(Course.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should create an intra course', async () => {
    const newCourse = {
      misc: 'name',
      company: new ObjectID(),
      subProgram: new ObjectID(),
      type: 'intra',
      salesRepresentative: new ObjectID(),
    };

    const result = await CourseHelper.createCourse(newCourse);

    expect(result.misc).toEqual('name');
    expect(result.subProgram).toEqual(newCourse.subProgram);
    expect(result.company).toEqual(newCourse.company);
    expect(result.format).toEqual('blended');
    expect(result.type).toEqual('intra');
    expect(result.salesRepresentative).toEqual(newCourse.salesRepresentative);
  });
});

describe('list', () => {
  let findCourseAndPopulate;
  const authCompany = new ObjectID();

  beforeEach(() => {
    findCourseAndPopulate = sinon.stub(CourseRepository, 'findCourseAndPopulate');
  });
  afterEach(() => {
    findCourseAndPopulate.restore();
  });

  it('should return courses', async () => {
    const coursesList = [{ misc: 'name' }, { misc: 'program' }];

    findCourseAndPopulate.returns(coursesList);

    const result = await CourseHelper.list({ trainer: '1234567890abcdef12345678', format: 'blended' });
    expect(result).toMatchObject(coursesList);
    sinon.assert.calledWithExactly(findCourseAndPopulate, { trainer: '1234567890abcdef12345678', format: 'blended' });
  });

  it('should return company courses', async () => {
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

    const result = await CourseHelper.list({
      company: authCompany.toHexString(),
      trainer: '1234567890abcdef12345678',
      format: 'blended',
    });
    expect(result).toMatchObject(coursesList);
    sinon.assert.calledWithExactly(
      findCourseAndPopulate.getCall(0),
      { company: authCompany.toHexString(), trainer: '1234567890abcdef12345678', type: 'intra', format: 'blended' }
    );
    sinon.assert.calledWithExactly(
      findCourseAndPopulate.getCall(1),
      { trainer: '1234567890abcdef12345678', type: 'inter_b2b', format: 'blended' },
      true
    );
  });

  it('should return company eLearning courses', async () => {
    const companyId = new ObjectID();
    const traineeId = new ObjectID();
    const coursesList = [
      {
        accessRules: [],
        format: 'strictly_e_learning',
        trainees: [
          { _id: traineeId, company: { _id: companyId } },
          { _id: new ObjectID(), company: { _id: new ObjectID() } },
          { _id: new ObjectID() },
        ],
      },
      { accessRules: [companyId], format: 'strictly_e_learning', trainees: [] },
    ];
    const filteredCourseList = [
      {
        accessRules: [],
        format: 'strictly_e_learning',
        trainees: [
          { _id: traineeId, company: { _id: companyId } },
        ],
      },
      { accessRules: [companyId], format: 'strictly_e_learning', trainees: [] },
    ];

    findCourseAndPopulate.returns(coursesList);

    const result = await CourseHelper.list({ company: companyId, format: 'strictly_e_learning' });
    expect(result).toMatchObject(filteredCourseList);

    sinon.assert.calledOnceWithExactly(
      findCourseAndPopulate,
      { format: 'strictly_e_learning', accessRules: { $in: [companyId, []] } }
    );
  });
});

describe('getCourseProgress', () => {
  it('should get progress for course', async () => {
    const steps = [{
      _id: new ObjectID(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: E_LEARNING,
      areActivitiesValid: false,
      progress: 1,
    },
    {
      _id: new ObjectID(),
      activities: [{ activityHistories: [{}, {}] }],
      name: 'Développement personnel full stack',
      type: ON_SITE,
      areActivitiesValid: false,
      progress: 1,
    }];

    const result = await CourseHelper.getCourseProgress(steps);
    expect(result).toBe(1);
  });

  it('should return 0 if no step', async () => {
    const steps = [];

    const result = await CourseHelper.getCourseProgress(steps);
    expect(result).toBe(0);
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
    const stepId = new ObjectID();
    const course = {
      misc: 'name',
      _id: new ObjectID(),
      subProgram: {
        steps: [{
          _id: new ObjectID(),
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
        { endDate: '2020-11-03T09:00:00.000Z', step: stepId },
        { endDate: '2020-11-04T16:01:00.000Z', step: stepId },
      ],
    };
    getProgress.returns(1);
    getCourseProgress.returns(1);

    const result = await CourseHelper.formatCourseWithProgress(course);
    expect(result).toMatchObject({
      ...course,
      subProgram: {
        ...course.subProgram,
        steps: course.subProgram.steps.map(step => ({ ...step, progress: 1 })),
      },
      progress: 1,
    });
    sinon.assert.calledWithExactly(getProgress.getCall(0), course.subProgram.steps[0], course.slots);
    sinon.assert.calledWithExactly(getProgress.getCall(1), course.subProgram.steps[1], course.slots);
    sinon.assert.calledWithExactly(getCourseProgress.getCall(0), [
      { ...course.subProgram.steps[0], progress: 1 },
      { ...course.subProgram.steps[1], progress: 1 },
    ]);
  });
});

describe('listUserCourses', () => {
  let courseFind;
  let formatCourseWithProgress;
  beforeEach(() => {
    courseFind = sinon.stub(Course, 'find');
    formatCourseWithProgress = sinon.stub(CourseHelper, 'formatCourseWithProgress');
  });
  afterEach(() => {
    courseFind.restore();
    formatCourseWithProgress.restore();
  });

  it('should return courses', async () => {
    const trainee = { _id: new ObjectID(), company: new ObjectID() };
    const stepId = new ObjectID();
    const coursesList = [
      {
        misc: 'name',
        _id: new ObjectID(),
        format: BLENDED,
        subProgram: {
          steps: [{
            _id: new ObjectID(),
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
          { endDate: '2020-11-03T09:00:00.000Z', step: stepId },
          { endDate: '2020-11-04T16:01:00.000Z', step: stepId },
        ],
      },
      {
        misc: 'program',
        _id: new ObjectID(),
        format: BLENDED,
        subProgram: {
          steps: [{
            _id: new ObjectID(),
            activities: [{ activityHistories: [{}, {}] }],
            name: 'Brochure : le mal de dos',
            type: 'e_learning',
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
          { endDate: '2019-11-06T09:00:00.000Z', step: stepId },
          { endDate: '2019-12-22T16:01:00.000Z', step: stepId },
        ],
      },
    ];

    courseFind.returns(SinonMongoose.stubChainedQueries([coursesList], ['populate', 'select', 'lean']));

    formatCourseWithProgress.onCall(0).returns({
      ...coursesList[0],
      subProgram: {
        ...coursesList[0].subProgram,
        steps: coursesList[0].subProgram.steps.map(step => ({ ...step, progress: 1 })),
      },
      progress: 1,
    });
    formatCourseWithProgress.onCall(1).returns({
      ...coursesList[1],
      subProgram: {
        ...coursesList[1].subProgram,
        steps: coursesList[1].subProgram.steps.map(step => ({ ...step, progress: 1 })),
      },
      progress: 1,
    });

    const result = await CourseHelper.listUserCourses(trainee);

    expect(result).toMatchObject(coursesList.map(
      course => (
        {
          ...course,
          subProgram: { ...course.subProgram, steps: course.subProgram.steps.map(step => ({ ...step, progress: 1 })) },
          progress: 1,
        }
      )
    ));

    SinonMongoose.calledWithExactly(
      courseFind,
      [
        {
          query: 'find',
          args: [
            { trainees: trainee._id, $or: [{ accessRules: [] }, { accessRules: trainee.company }] },
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
                select: 'name type activities',
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
          args: [{ path: 'slots', select: 'startDate endDate step', populate: { path: 'step', select: 'type' } }],
        },
        { query: 'select', args: ['_id misc'] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );

    sinon.assert.calledWithExactly(formatCourseWithProgress.getCall(0), coursesList[0]);
    sinon.assert.calledWithExactly(formatCourseWithProgress.getCall(1), coursesList[1]);
  });
});

describe('getCourse', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(Course, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return inter b2b course without trainees filtering', async () => {
    const course = {
      _id: new ObjectID(),
      type: 'inter_b2b',
      trainees: [{ _id: new ObjectID(), company: new ObjectID() }, { _id: new ObjectID(), company: new ObjectID() }],
    };
    findOne.returns(SinonMongoose.stubChainedQueries([course]));

    const result = await CourseHelper.getCourse(
      { _id: course._id },
      { role: { vendor: { name: 'vendor_admin' } }, company: { _id: new ObjectID() } }
    );
    expect(result).toMatchObject(course);

    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: course._id }] },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        {
          query: 'populate',
          args: [{
            path: 'subProgram',
            select: 'program steps',
            populate: [
              { path: 'program', select: 'name learningGoals' },
              {
                path: 'steps',
                select: 'name type',
                populate: {
                  path: 'activities', select: 'name type', populate: { path: 'activityHistories', select: 'user' },
                },
              },
            ],
          }],
        },
        { query: 'populate', args: [{ path: 'slots', populate: { path: 'step', select: 'name type' } }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        {
          query: 'populate',
          args: [{
            path: 'trainees',
            select: 'identity.firstname identity.lastname local.email contact picture.link',
            populate: { path: 'company', populate: { path: 'company', select: 'name' } },
          }],
        },
        { query: 'populate', args: [{ path: 'trainer', select: 'identity.firstname identity.lastname' }] },
        { query: 'populate', args: [{ path: 'accessRules', select: 'name' }] },
        { query: 'populate', args: [{ path: 'salesRepresentative', select: 'identity.firstname identity.lastname' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return inter b2b course with trainees filtering', async () => {
    const authCompanyId = new ObjectID();
    const otherCompanyId = new ObjectID();
    const loggedUser = { role: { client: { name: 'client_admin' } }, company: { _id: authCompanyId } };
    const course = {
      _id: new ObjectID(),
      type: 'inter_b2b',
      trainees: [{ _id: new ObjectID(), company: authCompanyId }, { _id: new ObjectID(), company: otherCompanyId }],
    };
    const courseWithAllTrainees = {
      type: 'inter_b2b',
      trainees: [{ company: authCompanyId }, { company: otherCompanyId }],
    };
    const courseWithFilteredTrainees = { type: 'inter_b2b', trainees: [{ company: authCompanyId }] };
    findOne.returns(SinonMongoose.stubChainedQueries([courseWithAllTrainees]));

    const result = await CourseHelper.getCourse({ _id: course._id }, loggedUser);

    expect(result).toMatchObject(courseWithFilteredTrainees);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: course._id }] },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        {
          query: 'populate',
          args: [{
            path: 'subProgram',
            select: 'program steps',
            populate: [
              { path: 'program', select: 'name learningGoals' },
              {
                path: 'steps',
                select: 'name type',
                populate: {
                  path: 'activities', select: 'name type', populate: { path: 'activityHistories', select: 'user' },
                },
              },
            ],
          }],
        },
        { query: 'populate', args: [{ path: 'slots', populate: { path: 'step', select: 'name type' } }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        {
          query: 'populate',
          args: [{
            path: 'trainees',
            select: 'identity.firstname identity.lastname local.email contact picture.link',
            populate: { path: 'company', populate: { path: 'company', select: 'name' } },
          }],
        },
        { query: 'populate', args: [{ path: 'trainer', select: 'identity.firstname identity.lastname' }] },
        { query: 'populate', args: [{ path: 'accessRules', select: 'name' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('selectUserHistory', () => {
  it('should return only the last history for each user', () => {
    const user1 = new ObjectID();
    const user2 = new ObjectID();
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
  let getTraineeProgress;
  beforeEach(() => {
    findOne = sinon.stub(Course, 'findOne');
    formatStep = sinon.stub(CourseHelper, 'formatStep');
    getTraineeProgress = sinon.stub(CourseHelper, 'getTraineeProgress');
  });
  afterEach(() => {
    findOne.restore();
    formatStep.restore();
    getTraineeProgress.restore();
  });

  it('should return course follow up', async () => {
    const course = {
      _id: '1234567890',
      subProgram: { name: 'je suis un sous programme', steps: [{ _id: 'abc' }, { _id: 'def' }, { _id: 'ghi' }] },
      trainees: [{ _id: '123213123', steps: { progress: 1 }, progress: 1, company: new ObjectID() }],
      slots: [{ _id: '123456789' }],
    };
    const trainees = [1, 2, 3, 4, 5];

    findOne.returns(SinonMongoose.stubChainedQueries([{ trainees }, course], ['populate', 'lean']));

    formatStep.callsFake(s => s);
    getTraineeProgress.returns({ steps: { progress: 1 }, progress: 1 });
    const result = await CourseHelper.getCourseFollowUp(course);

    expect(result).toEqual(course);

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
        { query: 'populate', args: [{ path: 'slots', populate: { path: 'step', select: '_id' } }] },
        { query: 'lean' },
      ],
      1
    );
  });

  it('should return course follow up with trainees from company', async () => {
    const companyId = new ObjectID();
    const course = {
      _id: '1234567890',
      subProgram: { name: 'je suis un sous programme', steps: [{ _id: 'abc' }, { _id: 'def' }, { _id: 'ghi' }] },
      trainees: [
        { _id: '123213123', steps: { progress: 1 }, progress: 1, company: companyId },
        { _id: '123213342', steps: { progress: 1 }, progress: 1, company: new ObjectID() },
      ],
      slots: [{ _id: '123456789' }],
    };
    const trainees = [1, 2, 3, 4, 5];

    findOne.returns(SinonMongoose.stubChainedQueries([{ trainees }, course], ['populate', 'lean']));
    formatStep.callsFake(s => s);
    getTraineeProgress.returns({ steps: { progress: 1 }, progress: 1 });

    const result = await CourseHelper.getCourseFollowUp(course, companyId);

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
        { query: 'populate', args: [{ path: 'slots', populate: { path: 'step', select: '_id' } }] },
        { query: 'lean' },
      ],
      1
    );
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
    const courseId = new ObjectID();
    const userId = new ObjectID();
    const activities = [
      { activityHistories: [{ _id: new ObjectID(), user: userId, questionnaireAnswersList: { card: {} } }] },
      { activityHistories: [{ _id: new ObjectID(), user: userId, questionnaireAnswersList: { card: {} } }] },
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
          { _id: new ObjectID(), program: { name: 'nom du programme' }, activities: [activities[0]] },
          { _id: new ObjectID(), program: { name: 'nom du programme' }, activities: [activities[1]] },
        ],
      },
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    formatActivity.onCall(0).returns({ followUp: [followUps[0]] });
    formatActivity.onCall(1).returns({ followUp: [followUps[1]] });

    const result = await CourseHelper.getQuestionnaireAnswers(courseId);

    expect(result).toMatchObject(followUps);
    SinonMongoose.calledWithExactly(
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
    const courseId = new ObjectID();
    const userId = new ObjectID();
    const activities = [{ activityHistories: [] }, { activityHistories: [] }];

    const course = {
      _id: courseId,
      misc: 'Groupe 3',
      trainees: [userId],
      subProgram: {
        steps: [
          { _id: new ObjectID(), program: { name: 'nom du programme' }, activities: [activities[0]] },
          { _id: new ObjectID(), program: { name: 'nom du programme' }, activities: [activities[1]] },
        ],
      },
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    formatActivity.onCall(0).returns({ followUp: [] });
    formatActivity.onCall(1).returns({ followUp: [] });

    const result = await CourseHelper.getQuestionnaireAnswers(courseId);

    expect(result).toMatchObject([]);
    SinonMongoose.calledWithExactly(
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
    const courseId = new ObjectID();
    const userId = new ObjectID();

    const course = {
      _id: courseId,
      misc: 'Groupe 3',
      trainees: [userId],
      subProgram: {},
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));

    const result = await CourseHelper.getQuestionnaireAnswers(courseId);

    expect(result).toMatchObject([]);
    SinonMongoose.calledWithExactly(
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

describe('getTraineeProgress', () => {
  let areObjectIdsEquals;
  let getProgress;
  let getCourseProgress;
  beforeEach(() => {
    areObjectIdsEquals = sinon.stub(UtilsHelper, 'areObjectIdsEquals');
    getProgress = sinon.stub(StepHelper, 'getProgress');
    getCourseProgress = sinon.stub(CourseHelper, 'getCourseProgress');
  });
  afterEach(() => {
    areObjectIdsEquals.restore();
    getProgress.restore();
    getCourseProgress.restore();
  });

  it('should return formatted steps and course progress', () => {
    const traineeId = new ObjectID();
    const otherTraineeId = new ObjectID();
    const steps = [{
      activities: [{ activityHistories: [{ user: traineeId }, { user: otherTraineeId }] }],
      type: ON_SITE,
    }];
    const slots = [{ endDate: '2020-11-03T09:00:00.000Z' }];

    const formattedSteps = [{
      activities: [{ activityHistories: [{ user: traineeId }] }],
      type: ON_SITE,
      progress: 1,
    }];

    areObjectIdsEquals.onCall(0).returns(true);
    areObjectIdsEquals.onCall(1).returns(false);
    getProgress.returns(1);
    getCourseProgress.returns(1);

    const result = CourseHelper.getTraineeProgress(traineeId, steps, slots);

    expect(result).toEqual({
      steps: [{ activities: [{ activityHistories: [{ user: traineeId }] }], type: ON_SITE, progress: 1 }],
      progress: 1,
    });
    sinon.assert.calledWithExactly(areObjectIdsEquals.getCall(0), traineeId, traineeId);
    sinon.assert.calledWithExactly(areObjectIdsEquals.getCall(1), otherTraineeId, traineeId);
    sinon.assert.calledOnceWithExactly(
      getProgress,
      { activities: [{ activityHistories: [{ user: traineeId }] }], type: ON_SITE },
      slots
    );
    sinon.assert.calledOnceWithExactly(getCourseProgress, formattedSteps);
  });
});

describe('getTraineeCourse', () => {
  let formatCourseWithProgress;
  let courseFindOne;
  beforeEach(() => {
    formatCourseWithProgress = sinon.stub(CourseHelper, 'formatCourseWithProgress');
    courseFindOne = sinon.stub(Course, 'findOne');
  });
  afterEach(() => {
    formatCourseWithProgress.restore();
    courseFindOne.restore();
  });

  it('should return courses', async () => {
    const stepId = new ObjectID();
    const course = {
      _id: new ObjectID(),
      subProgram: {
        steps: [{
          _id: new ObjectID(),
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
        { endDate: '2020-11-03T09:00:00.000Z', step: stepId },
        { endDate: '2020-11-04T16:01:00.000Z', step: stepId },
      ],
    };
    const credentials = { _id: new ObjectID() };

    courseFindOne.returns(SinonMongoose.stubChainedQueries([course], ['populate', 'select', 'lean']));

    formatCourseWithProgress.returns({
      ...course,
      subProgram: {
        ...course.subProgram,
        steps: course.subProgram.steps.map(step => ({ ...step, progress: 1 })),
      },
      progress: 1,
    });

    const result = await CourseHelper.getTraineeCourse(course._id, credentials);
    expect(result).toMatchObject({
      ...course,
      subProgram: {
        ...course.subProgram,
        steps: course.subProgram.steps.map(step => ({ ...step, progress: 1 })),
      },
      progress: 1,
    });

    SinonMongoose.calledWithExactly(
      courseFindOne,
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
                select: 'name type activities',
                populate: {
                  path: 'activities',
                  select: 'name type cards activityHistories',
                  populate: [
                    { path: 'activityHistories', match: { user: credentials._id } },
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
              populate: { path: 'step', select: 'type' },
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
        { query: 'select', args: ['_id misc contact'] },
        { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
      ]
    );

    sinon.assert.calledWithExactly(formatCourseWithProgress, course);
  });
});

describe('updateCourse', () => {
  let courseFindOneAndUpdate;
  beforeEach(() => {
    courseFindOneAndUpdate = sinon.stub(Course, 'findOneAndUpdate');
  });
  afterEach(() => {
    courseFindOneAndUpdate.restore();
  });

  it('should update an intra course', async () => {
    const courseId = new ObjectID();
    const payload = { misc: 'groupe 4' };

    courseFindOneAndUpdate.returns(SinonMongoose.stubChainedQueries([payload], ['lean']));

    const result = await CourseHelper.updateCourse(courseId, payload);
    expect(result.misc).toEqual(payload.misc);

    SinonMongoose.calledWithExactly(
      courseFindOneAndUpdate,
      [
        { query: 'findOneAndUpdate', args: [{ _id: courseId }, { $set: payload }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('deleteCourse', () => {
  let deleteCourse;
  let deleteCourseSmsHistory;
  beforeEach(() => {
    deleteCourse = sinon.stub(Course, 'deleteOne');
    deleteCourseSmsHistory = sinon.stub(CourseSmsHistory, 'deleteMany');
  });
  afterEach(() => {
    deleteCourse.restore();
    deleteCourseSmsHistory.restore();
  });

  it('should delete course and sms history', async () => {
    const courseId = new ObjectID();
    await CourseHelper.deleteCourse(courseId);

    sinon.assert.calledOnceWithExactly(deleteCourse, { _id: courseId });
    sinon.assert.calledOnceWithExactly(deleteCourseSmsHistory, { course: courseId });
  });
});

describe('sendSMS', () => {
  const courseId = new ObjectID();
  const trainees = [
    { contact: { phone: '0123456789' }, identity: { firstname: 'non', lasname: 'ok' }, _id: 'qwertyuio' },
    { contact: { phone: '0987654321' }, identity: { firstname: 'test', lasname: 'ok' }, _id: 'asdfghjkl' },
    { contact: {}, identity: { firstname: 'test', lasname: 'ko' }, _id: 'poiuytrewq' },
  ];
  const payload = { content: 'Ceci est un test.' };
  const credentials = { _id: new ObjectID() };

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
    courseFindById.returns(SinonMongoose.stubChainedQueries([{ trainees }]));
    sendStub.onCall(0).returns();
    sendStub.onCall(1).returns(new Promise(() => { throw Boom.badRequest(); }));

    await CourseHelper.sendSMS(courseId, payload, credentials);

    SinonMongoose.calledWithExactly(
      courseFindById,
      [
        { query: 'findById', args: [courseId] },
        { query: 'populate', args: [{ path: 'trainees', select: '_id contact' }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(
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
      courseFindById.returns(SinonMongoose.stubChainedQueries([{ trainees }]));
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

    courseFindById.returns(SinonMongoose.stubChainedQueries([{ trainees: traineesWithoutPhoneNumbers }]));

    await CourseHelper.sendSMS(courseId, payload, credentials);

    sinon.assert.notCalled(sendStub);
    sinon.assert.notCalled(courseSmsHistoryCreate);
  });
});

describe('getSMSHistory', () => {
  const courseId = new ObjectID();
  const sms = [{ type: 'convocation', message: 'Hello, this is a test' }];
  let courseSmsHistoryFind;
  beforeEach(() => {
    courseSmsHistoryFind = sinon.stub(CourseSmsHistory, 'find');
  });
  afterEach(() => {
    courseSmsHistoryFind.restore();
  });

  it('should get SMS history', async () => {
    courseSmsHistoryFind.returns(SinonMongoose.stubChainedQueries([sms]));

    const result = await CourseHelper.getSMSHistory(courseId);

    expect(result).toEqual(sms);
    SinonMongoose.calledWithExactly(
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

describe('addCourseTrainee', () => {
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
    const user = { _id: new ObjectID(), formationExpoTokenList: 'ExponentPushToken[bla]' };
    const course = { _id: new ObjectID(), misc: 'Test' };
    const payload = { trainee: user._id };
    const credentials = { _id: new ObjectID(), company: { _id: new ObjectID() } };

    userFindOne.returns(user);
    userFindOne.returns(SinonMongoose.stubChainedQueries([user], ['lean']));

    await CourseHelper.addCourseTrainee(course._id, payload, credentials);

    sinon.assert.calledOnceWithExactly(courseUpdateOne, { _id: course._id }, { $addToSet: { trainees: user._id } });
    SinonMongoose.calledWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: user._id }, { formationExpoTokenList: 1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      createHistoryOnTraineeAddition,
      { course: course._id, traineeId: user._id },
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
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    await CourseHelper.registerToELearningCourse(courseId, credentials);
    sinon.assert.calledWithExactly(updateOne, { _id: courseId }, { $addToSet: { trainees: credentials._id } });
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
    const course = new ObjectID();
    const traineeId = new ObjectID();
    const removedBy = { _id: new ObjectID() };

    await CourseHelper.removeCourseTrainee(course, traineeId, removedBy);
    sinon.assert.calledWithExactly(updateOne, { _id: course }, { $pull: { trainees: traineeId } });
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
  let getCourseDuration;
  let groupSlotsByDate;
  let formatIntraCourseSlotsForPdf;
  beforeEach(() => {
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    getCourseDuration = sinon.stub(CourseHelper, 'getCourseDuration');
    groupSlotsByDate = sinon.stub(CourseHelper, 'groupSlotsByDate');
    formatIntraCourseSlotsForPdf = sinon.stub(CourseHelper, 'formatIntraCourseSlotsForPdf');
  });
  afterEach(() => {
    formatIdentity.restore();
    getCourseDuration.restore();
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
      company: { name: 'alenvi' },
    };

    getCourseDuration.returns('8h');
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
    sinon.assert.calledOnceWithExactly(getCourseDuration, course.slots);
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
  let getCourseDuration;
  let formatInterCourseSlotsForPdf;
  beforeEach(() => {
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
    getCourseDuration = sinon.stub(CourseHelper, 'getCourseDuration');
    formatInterCourseSlotsForPdf = sinon.stub(CourseHelper, 'formatInterCourseSlotsForPdf');
  });
  afterEach(() => {
    formatIdentity.restore();
    getCourseDuration.restore();
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
    getCourseDuration.returns('7h');

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
    sinon.assert.calledOnceWithExactly(getCourseDuration, sortedSlots);
    sinon.assert.callCount(formatInterCourseSlotsForPdf, 3);
  });
});

describe('generateAttendanceSheets', () => {
  let courseFindOne;
  let formatInterCourseForPdf;
  let formatIntraCourseForPdf;
  let generatePdf;
  let interAttendanceSheetGetPdfContent;
  let intraAttendanceSheetGetPdfContent;
  beforeEach(() => {
    courseFindOne = sinon.stub(Course, 'findOne');
    formatInterCourseForPdf = sinon.stub(CourseHelper, 'formatInterCourseForPdf');
    formatIntraCourseForPdf = sinon.stub(CourseHelper, 'formatIntraCourseForPdf');
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
    interAttendanceSheetGetPdfContent = sinon.stub(InterAttendanceSheet, 'getPdfContent');
    intraAttendanceSheetGetPdfContent = sinon.stub(IntraAttendanceSheet, 'getPdfContent');
  });
  afterEach(() => {
    courseFindOne.restore();
    formatInterCourseForPdf.restore();
    formatIntraCourseForPdf.restore();
    generatePdf.restore();
    interAttendanceSheetGetPdfContent.restore();
    intraAttendanceSheetGetPdfContent.restore();
  });

  it('should download attendance sheet for inter b2b course', async () => {
    const courseId = new ObjectID();
    const course = { misc: 'des infos en plus', type: 'inter_b2b' };

    courseFindOne.returns(SinonMongoose.stubChainedQueries([course]));

    formatInterCourseForPdf.returns({ name: 'la formation - des infos en plus' });
    generatePdf.returns('pdf');
    interAttendanceSheetGetPdfContent.returns({ content: [{ text: 'la formation - des infos en plus' }] });

    await CourseHelper.generateAttendanceSheets(courseId);

    SinonMongoose.calledWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }] },
      { query: 'populate', args: ['company'] },
      { query: 'populate', args: [{ path: 'slots', populate: { path: 'step', select: 'type' } }] },
      {
        query: 'populate',
        args: [{ path: 'trainees', populate: { path: 'company', populate: { path: 'company', select: 'name' } } }],
      },
      { query: 'populate', args: ['trainer'] },
      {
        query: 'populate',
        args: [{ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } }],
      },
      { query: 'lean' },
    ]);
    sinon.assert.calledOnceWithExactly(formatInterCourseForPdf, course);
    sinon.assert.notCalled(formatIntraCourseForPdf);
    sinon.assert.notCalled(intraAttendanceSheetGetPdfContent);
    sinon.assert.calledOnceWithExactly(generatePdf, { content: [{ text: 'la formation - des infos en plus' }] });
    sinon.assert.calledOnceWithExactly(interAttendanceSheetGetPdfContent, { name: 'la formation - des infos en plus' });
  });

  it('should download attendance sheet for intra course', async () => {
    const courseId = new ObjectID();
    const course = { misc: 'des infos en plus', type: 'intra' };

    courseFindOne.returns(SinonMongoose.stubChainedQueries([course]));

    formatIntraCourseForPdf.returns({ name: 'la formation - des infos en plus' });
    generatePdf.returns('pdf');
    intraAttendanceSheetGetPdfContent.returns({ content: [{ text: 'la formation - des infos en plus' }] });

    await CourseHelper.generateAttendanceSheets(courseId);

    SinonMongoose.calledWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }] },
      { query: 'populate', args: ['company'] },
      { query: 'populate', args: [{ path: 'slots', populate: { path: 'step', select: 'type' } }] },
      {
        query: 'populate',
        args: [{ path: 'trainees', populate: { path: 'company', populate: { path: 'company', select: 'name' } } }],
      },
      { query: 'populate', args: ['trainer'] },
      {
        query: 'populate',
        args: [{ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } }],
      },
      { query: 'lean' },
    ]);
    sinon.assert.calledOnceWithExactly(formatIntraCourseForPdf, course);
    sinon.assert.notCalled(formatInterCourseForPdf);
    sinon.assert.notCalled(interAttendanceSheetGetPdfContent);
    sinon.assert.calledOnceWithExactly(generatePdf, { content: [{ text: 'la formation - des infos en plus' }] });
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
      learningGoals: 'Apprendre',
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
  let courseFindOne;
  let formatCourseForDocx;
  let formatIdentity;
  let createDocx;
  let generateZip;
  let momentFormat;
  let createReadStream;
  let downloadFileById;
  let tmpDir;
  beforeEach(() => {
    courseFindOne = sinon.stub(Course, 'findOne');
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
    courseFindOne.restore();
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

    courseFindOne.returns(SinonMongoose.stubChainedQueries([course]));
    formatCourseForDocx.returns({
      program: { learningGoals: 'Apprendre', name: 'nom du programme' },
      courseDuration: '8h',
    });
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
      {
        program: { learningGoals: 'Apprendre', name: 'nom du programme' },
        courseDuration: '8h',
        traineeIdentity: 'trainee 1',
        date: '20/01/2020',
      }
    );
    sinon.assert.calledWithExactly(
      createDocx.getCall(1),
      '/path/certificate_template.docx',
      {
        program: { learningGoals: 'Apprendre', name: 'nom du programme' },
        courseDuration: '8h',
        traineeIdentity: 'trainee 2',
        date: '20/01/2020',
      }
    );
    sinon.assert.calledWithExactly(
      createDocx.getCall(2),
      '/path/certificate_template.docx',
      {
        program: { learningGoals: 'Apprendre', name: 'nom du programme' },
        courseDuration: '8h',
        traineeIdentity: 'trainee 3',
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
    sinon.assert.calledOnceWithExactly(downloadFileById, {
      fileId: process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID,
      tmpFilePath: '/path/certificate_template.docx',
    });
    SinonMongoose.calledWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }] },
      { query: 'populate', args: ['slots'] },
      { query: 'populate', args: ['trainees'] },
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
    const courseId = new ObjectID();
    const payload = { company: new ObjectID() };

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
    const courseId = new ObjectID();
    const accessRuleId = new ObjectID();

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
    const courseId = new ObjectID();
    const course = {
      _id: courseId,
      subProgram: { program: { name: 'Comment attraper des Pokemons' } },
      trainer: { identity: { firstname: 'Ash', lastname: 'Ketchum' } },
      contact: { phone: '0123456789' },
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

    formatIdentity.returns('Ash Ketchum');
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
      contact: { phone: '0123456789', formattedPhone: '01 23 45 67 89' },
      slots: [
        { date: '12/10/2020', hours: '13:30 - 14:30', address: '3 rue T' },
        { date: '14/10/2020', hours: '18:30 - 20:30', meetingLink: 'http://eelslap.com/' },
      ],
    });

    sinon.assert.calledOnceWithExactly(formatIdentity, { firstname: 'Ash', lastname: 'Ketchum' }, 'FL');
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
  let generatePdf;
  let courseFindOne;
  let getPdfContent;
  beforeEach(() => {
    formatCourseForConvocationPdf = sinon.stub(CourseHelper, 'formatCourseForConvocationPdf');
    generatePdf = sinon.stub(PdfHelper, 'generatePdf');
    courseFindOne = sinon.stub(Course, 'findOne');
    getPdfContent = sinon.stub(CourseConvocation, 'getPdfContent');
  });
  afterEach(() => {
    formatCourseForConvocationPdf.restore();
    generatePdf.restore();
    courseFindOne.restore();
    getPdfContent.restore();
  });

  it('should return pdf', async () => {
    const courseId = new ObjectID();

    courseFindOne.returns(SinonMongoose.stubChainedQueries(
      [{
        _id: courseId,
        subProgram: { program: { name: 'Comment attraper des Pokemons' } },
        trainer: { identity: { firstname: 'Ash', lastname: 'Ketchum' } },
        contact: { phone: '0123456789' },
        slots: [{
          startDate: '2020-10-12T12:30:00.000+01:00',
          endDate: '2020-10-12T13:30:00.000+01:00',
          address: { fullAddress: '37 rue de Ponthieu 75005 Paris' },
        }],
      }]
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

    generatePdf.returns('pdf');
    getPdfContent.returns({ content: 'test' });

    const result = await CourseHelper.generateConvocationPdf(courseId);

    expect(result).toEqual({ pdf: 'pdf', courseName: 'Comment-attraper-des-Pokemons' });
    SinonMongoose.calledWithExactly(courseFindOne, [
      { query: 'findOne', args: [{ _id: courseId }] },
      {
        query: 'populate',
        args: [{
          path: 'subProgram',
          select: 'program',
          populate: { path: 'program', select: 'name description' },
        }],
      },
      { query: 'populate', args: ['slots'] },
      { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
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
    sinon.assert.calledOnceWithExactly(generatePdf, { content: 'test' });
    sinon.assert.calledOnceWithExactly(
      getPdfContent,
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
    const courseId = new ObjectID();
    const questionnaires = [
      { name: 'test', type: 'expectations', historiesCount: 1 },
      { name: 'test2', type: 'expectations', historiesCount: 0 },
    ];

    findQuestionnaire.returns(SinonMongoose.stubChainedQueries([questionnaires], ['select', 'populate', 'lean']));

    const result = await CourseHelper.getQuestionnaires(courseId);

    expect(result).toMatchObject([questionnaires[0]]);
    SinonMongoose.calledWithExactly(
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
