/* eslint-disable max-len */
const { ObjectId } = require('mongodb');
const has = require('lodash/has');
const get = require('lodash/get');
const expect = require('expect');
const sinon = require('sinon');
const CourseSlot = require('../../../src/models/CourseSlot');
const Course = require('../../../src/models/Course');
const CourseSmsHistory = require('../../../src/models/CourseSmsHistory');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const Questionnaire = require('../../../src/models/Questionnaire');
const CourseHelper = require('../../../src/helpers/courses');
const ExportHelper = require('../../../src/helpers/vendorHistoryExport');
const UtilsHelper = require('../../../src/helpers/utils');
const {
  INTRA,
  INTER_B2B,
  ON_SITE,
  REMOTE,
  E_LEARNING,
  LESSON,
  PUBLISHED,
  EXPECTATIONS,
  END_OF_COURSE,
  PAYMENT,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  NO_DATA,
} = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const CourseBill = require('../../../src/models/CourseBill');

describe('exportCourseHistory', () => {
  const traineeList = [
    { _id: new ObjectId(), firstMobileConnection: new Date() },
    { _id: new ObjectId(), firstMobileConnection: new Date() },
    { _id: new ObjectId() },
    { _id: new ObjectId() },
    { _id: new ObjectId() },
  ];
  const activityListIds = [new ObjectId(), new ObjectId(), new ObjectId()];
  const activityHistoryList = [
    { _id: new ObjectId(), user: traineeList[3]._id, activity: activityListIds[0] },
    { _id: new ObjectId(), user: traineeList[3]._id, activity: activityListIds[1] },
    { _id: new ObjectId(), user: traineeList[3]._id, activity: activityListIds[2] },
    { _id: new ObjectId(), user: traineeList[4]._id, activity: activityListIds[2] },
  ];

  const activityList = [
    {
      _id: activityListIds[0],
      name: 'activity 1',
      type: LESSON,
      status: PUBLISHED,
      activityHistories: [activityHistoryList[0]],
    },
    {
      _id: activityListIds[1],
      name: 'activity 2',
      type: LESSON,
      status: PUBLISHED,
      activityHistories: [activityHistoryList[1]],

    },
    {
      _id: activityListIds[2],
      name: 'activity 3',
      type: LESSON,
      status: PUBLISHED,
      activityHistories: [activityHistoryList[2], activityHistoryList[3]],
    },
  ];

  const stepList = [
    { _id: new ObjectId(), name: 'étape 1', type: ON_SITE },
    { _id: new ObjectId(), name: 'étape 2', type: REMOTE },
    { _id: new ObjectId(), name: 'étape 3', type: E_LEARNING, activities: activityList.map(activity => activity) },
  ];

  const subProgramList = [
    {
      _id: new ObjectId(),
      name: 'subProgram 1',
      program: { name: 'Program 1' },
      steps: [stepList[0], stepList[1]],
    },
    {
      _id: new ObjectId(),
      name: 'subProgram 2',
      program: { name: 'Program 2' },
      steps: [stepList[0], stepList[2]],
    },
  ];
  const trainer = { _id: new ObjectId(), identity: { firstname: 'Gilles', lastname: 'Formateur' } };
  const salesRepresentative = { _id: new ObjectId(), identity: { firstname: 'Aline', lastname: 'Contact-Com' } };

  const courseIdList = [new ObjectId(), new ObjectId(), new ObjectId()];

  const courseSlotList = [
    {
      _id: new ObjectId(),
      course: courseIdList[0],
      startDate: '2021-05-01T08:00:00.000Z',
      endDate: '2021-05-01T10:00:00.000Z',
      attendances: [{ trainee: traineeList[0]._id }],
    },
    {
      _id: new ObjectId(),
      course: courseIdList[0],
      startDate: '2021-05-01T14:00:00.000Z',
      endDate: '2021-05-01T16:00:00.000Z',
      attendances: [{ trainee: traineeList[0]._id }, { trainee: traineeList[1]._id }],
    },
    {
      _id: new ObjectId(),
      course: courseIdList[1],
      startDate: '2021-02-01T08:00:00.000Z',
      endDate: '2021-02-01T10:00:00.000Z',
      attendances: [{ trainee: traineeList[1]._id }, { trainee: traineeList[3]._id }],
    },
    {
      _id: new ObjectId(),
      course: courseIdList[1],
      startDate: '2021-02-02T08:00:00.000Z',
      endDate: '2021-02-02T10:00:00.000Z',
      attendances: [{ trainee: traineeList[1]._id }, { trainee: traineeList[3]._id }],
    },
    {
      _id: new ObjectId(),
      course: courseIdList[1],
      step: new ObjectId(),
    },
  ];
  const company = { _id: new ObjectId(), name: 'Test SAS' };
  const courseList = [
    {
      _id: courseIdList[0],
      type: INTRA,
      company,
      subProgram: subProgramList[0],
      misc: 'group 1',
      trainer,
      salesRepresentative,
      contact: salesRepresentative,
      trainees: [traineeList[0], traineeList[1], traineeList[2]],
      slotsToPlan: [],
      slots: [courseSlotList[0], courseSlotList[1]],
      bills: [
        {
          course: courseIdList[0],
          mainFee: { price: 120, count: 1 },
          company,
          payer: { name: 'APA Paris' },
          billedAt: '2022-03-08T00:00:00.000Z',
          number: 'FACT-00001',
          courseCreditNote: { courseBill: new ObjectId() },
          coursePayments: [{ netInclTaxes: 10, nature: PAYMENT }],
        },
        {
          course: courseIdList[0],
          mainFee: { price: 120, count: 1 },
          company,
          payer: { name: 'APA Paris' },
          billedAt: '2022-03-08T00:00:00.000Z',
          number: 'FACT-00002',
          courseCreditNote: null,
          coursePayments: [{ netInclTaxes: 110, nature: PAYMENT }],
        },
      ],
    },
    {
      _id: courseIdList[1],
      type: INTER_B2B,
      subProgram: subProgramList[1],
      misc: 'group 2',
      estimatedStartDate: '2019-01-01T08:00:00',
      trainer,
      salesRepresentative,
      contact: salesRepresentative,
      trainees: [traineeList[3], traineeList[4]],
      slotsToPlan: [courseSlotList[4]],
      slots: [courseSlotList[2], courseSlotList[3]],
      bills: [],
    },
    {
      _id: courseIdList[2],
      type: INTER_B2B,
      subProgram: subProgramList[1],
      misc: 'group 3',
      estimatedStartDate: '2022-01-01T08:00:00',
      trainer,
      salesRepresentative,
      contact: salesRepresentative,
      trainees: [traineeList[3], traineeList[4]],
      slotsToPlan: [],
      slots: [],
      bills: [],
    },
  ];

  const questionnaireList = [
    { _id: new ObjectId(), type: EXPECTATIONS, name: 'attentes', status: PUBLISHED },
    { _id: new ObjectId(), type: END_OF_COURSE, name: 'satisfaction', status: PUBLISHED },
  ];
  const questionnaireHistoriesList = [
    { _id: new ObjectId(), course: courseList[0]._id, user: traineeList[0]._id, questionnaire: questionnaireList[0] },
    { _id: new ObjectId(), course: courseList[0]._id, user: traineeList[0]._id, questionnaire: questionnaireList[1] },
    { _id: new ObjectId(), course: courseList[0]._id, user: traineeList[1]._id, questionnaire: questionnaireList[1] },
    { _id: new ObjectId(), course: courseList[0]._id, user: traineeList[2]._id, questionnaire: questionnaireList[0] },
    { _id: new ObjectId(), course: courseList[1]._id, user: traineeList[3]._id, questionnaire: questionnaireList[0] },
    { _id: new ObjectId(), course: courseList[1]._id, user: traineeList[3]._id, questionnaire: questionnaireList[1] },
  ];

  const credentials = { company: { _id: new ObjectId(), role: { vendor: { name: TRAINING_ORGANISATION_MANAGER } } } };

  let findCourseSlot;
  let findCourse;
  let groupSlotsByDate;
  let getTotalDurationForExport;
  let findCourseSmsHistory;
  let findAttendanceSheet;
  let findQuestionnaireHistory;

  beforeEach(() => {
    findCourseSlot = sinon.stub(CourseSlot, 'find');
    findCourse = sinon.stub(Course, 'find');
    groupSlotsByDate = sinon.stub(CourseHelper, 'groupSlotsByDate');
    getTotalDurationForExport = sinon.stub(UtilsHelper, 'getTotalDurationForExport');
    findCourseSmsHistory = sinon.stub(CourseSmsHistory, 'find');
    findAttendanceSheet = sinon.stub(AttendanceSheet, 'find');
    findQuestionnaireHistory = sinon.stub(QuestionnaireHistory, 'find');
  });

  afterEach(() => {
    findCourseSlot.restore();
    findCourse.restore();
    groupSlotsByDate.restore();
    getTotalDurationForExport.restore();
    findCourseSmsHistory.restore();
    findAttendanceSheet.restore();
    findQuestionnaireHistory.restore();
  });

  it('should return an empty array if no course', async () => {
    findCourseSlot.returns(SinonMongoose.stubChainedQueries(courseSlotList, ['lean']));
    findCourse.returns(SinonMongoose.stubChainedQueries([]));
    findQuestionnaireHistory.returns(SinonMongoose.stubChainedQueries(questionnaireHistoriesList));
    findCourseSmsHistory.returns(SinonMongoose.stubChainedQueries(
      [{ course: courseList[0]._id }, { course: courseList[0]._id }, { course: courseList[1]._id }],
      ['lean']
    ));
    findAttendanceSheet.returns(SinonMongoose.stubChainedQueries(
      [{ course: courseList[0]._id }],
      ['lean']
    ));

    const result = await ExportHelper.exportCourseHistory('2021-01-14T23:00:00.000Z', '2022-01-20T22:59:59.000Z');

    expect(result).toEqual([[NO_DATA]]);
    SinonMongoose.calledOnceWithExactly(
      findCourseSlot,
      [
        {
          query: 'find',
          args: [{ startDate: { $lte: '2022-01-20T22:59:59.000Z' }, endDate: { $gte: '2021-01-14T23:00:00.000Z' } }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findCourse,
      [
        {
          query: 'find',
          args: [{
            $or: [
              { _id: { $in: courseSlotList.map(slot => slot.course) } },
              {
                estimatedStartDate: { $lte: '2022-01-20T22:59:59.000Z', $gte: '2021-01-14T23:00:00.000Z' },
                archivedAt: { $exists: false },
              },
            ],
            select: '_id type misc estimatedStartDate',
          }],
        },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        {
          query: 'populate',
          args: [
            {
              path: 'subProgram',
              select: 'name steps program',
              populate: [
                { path: 'program', select: 'name' },
                {
                  path: 'steps',
                  select: 'type activities',
                  populate: { path: 'activities', populate: { path: 'activityHistories' } },
                },
              ],
            }],
        },
        { query: 'populate', args: [{ path: 'trainer', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'salesRepresentative', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'contact', select: 'identity' }] },
        {
          query: 'populate',
          args: [{ path: 'slots', populate: 'attendances', select: 'attendances startDate endDate' }],
        },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'populate', args: [{ path: 'trainees', select: 'firstMobileConnection' }] },
        {
          query: 'populate',
          args: [{
            path: 'bills',
            select: 'payer company billedAt mainFee billingPurchaseList',
            options: { isVendorUser: has(credentials, 'role.vendor') },
            populate: [
              { path: 'payer.fundingOrganisation', select: 'name' },
              { path: 'payer.company', select: 'name' },
              { path: 'company', select: 'name' },
              { path: 'courseCreditNote', options: { isVendorUser: !!get(credentials, 'role.vendor') }, select: '_id' },
              {
                path: 'coursePayments',
                select: 'netInclTaxes nature',
                options: { isVendorUser: !!get(credentials, 'role.vendor') },
              },
            ],
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(groupSlotsByDate);
    sinon.assert.notCalled(getTotalDurationForExport);
    SinonMongoose.calledOnceWithExactly(
      findQuestionnaireHistory,
      [
        { query: 'find', args: [{ course: { $in: [] }, select: 'course questionnaire' }] },
        { query: 'populate', args: [{ path: 'questionnaire', select: 'type' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findCourseSmsHistory,
      [{ query: 'find', args: [{ course: { $in: [] }, select: 'course' }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findAttendanceSheet,
      [{ query: 'find', args: [{ course: { $in: [] }, select: 'course' }] }, { query: 'lean' }]
    );
  });

  it('should return an array with the header and 3 rows', async () => {
    findCourseSlot.returns(SinonMongoose.stubChainedQueries(courseSlotList, ['lean']));
    findCourse.returns(SinonMongoose.stubChainedQueries(courseList));
    findQuestionnaireHistory.returns(SinonMongoose.stubChainedQueries(questionnaireHistoriesList));
    groupSlotsByDate.onCall(0).returns([[courseSlotList[0], courseSlotList[1]]]);
    groupSlotsByDate.onCall(1).returns([[courseSlotList[2]], [courseSlotList[3]]]);
    groupSlotsByDate.onCall(2).returns([]);
    getTotalDurationForExport.onCall(0).returns('4,00');
    getTotalDurationForExport.onCall(1).returns('4,00');
    getTotalDurationForExport.onCall(2).returns('0,00');
    findCourseSmsHistory.returns(SinonMongoose.stubChainedQueries(
      [{ course: courseList[0]._id }, { course: courseList[0]._id }, { course: courseList[1]._id }],
      ['lean']
    ));
    findAttendanceSheet.returns(SinonMongoose.stubChainedQueries(
      [{ course: courseList[0]._id }],
      ['lean']
    ));

    const result = await ExportHelper
      .exportCourseHistory('2021-01-14T23:00:00.000Z', '2022-01-20T22:59:59.000Z', credentials);

    expect(result).toEqual([
      [
        'Identifiant',
        'Type',
        'Payeur',
        'Structure',
        'Programme',
        'Sous-Programme',
        'Infos complémentaires',
        'Formateur',
        'Référent Compani',
        'Contact pour la formation',
        'Nombre d\'inscrits',
        'Nombre de dates',
        'Nombre de créneaux',
        'Nombre de créneaux à planifier',
        'Durée Totale',
        'Nombre de SMS envoyés',
        'Nombre de personnes connectées à l\'app',
        'Complétion eLearning moyenne',
        'Nombre de réponses au questionnaire de recueil des attentes',
        'Nombre de réponses au questionnaire de satisfaction',
        'Date de démarrage souhaitée',
        'Début de formation',
        'Fin de formation',
        'Nombre de feuilles d\'émargement chargées',
        'Nombre de présences',
        'Nombre d\'absences',
        'Nombre de stagiaires non prévus',
        'Nombre de présences non prévues',
        'Avancement',
        'Facturée',
        'Montant facturé',
        'Montant réglé',
        'Solde',
      ],
      [
        courseList[0]._id,
        'intra',
        'APA Paris',
        'Test SAS',
        'Program 1',
        'subProgram 1',
        'group 1',
        'Gilles FORMATEUR',
        'Aline CONTACT-COM',
        'Aline CONTACT-COM',
        3,
        1,
        2,
        0,
        '4,00',
        2,
        2,
        '',
        2,
        2,
        '',
        '01/05/2021 10:00:00',
        '01/05/2021 18:00:00',
        1,
        3,
        3,
        0,
        0,
        '1,00',
        'Oui',
        '120,00',
        '110,00',
        '-10,00',
      ],
      [
        courseList[1]._id,
        'inter_b2b',
        '',
        '',
        'Program 2',
        'subProgram 2',
        'group 2',
        'Gilles FORMATEUR',
        'Aline CONTACT-COM',
        'Aline CONTACT-COM',
        2,
        2,
        2,
        1,
        '4,00',
        1,
        0,
        '0,67',
        1,
        1,
        '01/01/2019',
        '01/02/2021 09:00:00',
        'à planifier',
        0,
        2,
        2,
        1,
        2,
        '0,67',
        '',
        '',
        '',
        '',
      ],
      [
        courseList[2]._id,
        'inter_b2b',
        '',
        '',
        'Program 2',
        'subProgram 2',
        'group 3',
        'Gilles FORMATEUR',
        'Aline CONTACT-COM',
        'Aline CONTACT-COM',
        2,
        0,
        0,
        0,
        '0,00',
        0,
        0,
        '0,67',
        0,
        0,
        '01/01/2022',
        '',
        '',
        0,
        0,
        0,
        0,
        0,
        '',
        '',
        '',
        '',
        '',
      ],
    ]);
    SinonMongoose.calledOnceWithExactly(
      findCourseSlot,
      [
        {
          query: 'find',
          args: [{ startDate: { $lte: '2022-01-20T22:59:59.000Z' }, endDate: { $gte: '2021-01-14T23:00:00.000Z' } }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findCourse,
      [
        {
          query: 'find',
          args: [{
            $or: [
              { _id: { $in: courseSlotList.map(slot => slot.course) } },
              {
                estimatedStartDate: { $lte: '2022-01-20T22:59:59.000Z', $gte: '2021-01-14T23:00:00.000Z' },
                archivedAt: { $exists: false },
              },
            ],
            select: '_id type misc estimatedStartDate',
          }],
        },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        {
          query: 'populate',
          args: [
            {
              path: 'subProgram',
              select: 'name steps program',
              populate: [
                { path: 'program', select: 'name' },
                {
                  path: 'steps',
                  select: 'type activities',
                  populate: { path: 'activities', populate: { path: 'activityHistories' } },
                },
              ],
            }],
        },
        { query: 'populate', args: [{ path: 'trainer', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'salesRepresentative', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'contact', select: 'identity' }] },
        {
          query: 'populate',
          args: [{ path: 'slots', populate: 'attendances', select: 'attendances startDate endDate' }],
        },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'populate', args: [{ path: 'trainees', select: 'firstMobileConnection' }] },
        {
          query: 'populate',
          args: [{
            path: 'bills',
            select: 'payer company billedAt mainFee billingPurchaseList',
            options: { isVendorUser: has(credentials, 'role.vendor') },
            populate: [
              { path: 'payer.fundingOrganisation', select: 'name' },
              { path: 'payer.company', select: 'name' },
              { path: 'company', select: 'name' },
              { path: 'courseCreditNote', options: { isVendorUser: !!get(credentials, 'role.vendor') }, select: '_id' },
              {
                path: 'coursePayments',
                select: 'netInclTaxes nature',
                options: { isVendorUser: !!get(credentials, 'role.vendor') },
              },
            ],
          }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findQuestionnaireHistory,
      [
        { query: 'find', args: [{ course: { $in: courseIdList }, select: 'course questionnaire' }] },
        { query: 'populate', args: [{ path: 'questionnaire', select: 'type' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findCourseSmsHistory,
      [{ query: 'find', args: [{ course: { $in: courseIdList }, select: 'course' }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findAttendanceSheet,
      [{ query: 'find', args: [{ course: { $in: courseIdList }, select: 'course' }] }, { query: 'lean' }]
    );
  });
});

describe('exportCourseSlotHistory', () => {
  const courseIdList = [new ObjectId(), new ObjectId()];

  const traineeList = [
    { _id: new ObjectId() },
    { _id: new ObjectId() },
    { _id: new ObjectId() },
    { _id: new ObjectId() },
    { _id: new ObjectId() },
  ];

  const courseList = [
    {
      _id: courseIdList[0],
      trainees: [traineeList[0]._id, traineeList[1]._id, traineeList[2]._id],
      type: INTRA,
      company: { _id: new ObjectId(), name: 'Enbonne Company' },
      subProgram: { _id: new ObjectId(), program: { _id: new ObjectId(), name: 'Program 1' } },
      misc: 'group 1',
    },
    {
      _id: courseIdList[1],
      trainees: [traineeList[3]._id, traineeList[4]._id],
      type: INTER_B2B,
      subProgram: { _id: new ObjectId(), program: { _id: new ObjectId(), name: 'Program 2' } },
      misc: 'group 2',
    },
  ];

  const stepList = [
    { _id: new ObjectId(), name: 'étape 1', type: ON_SITE },
    { _id: new ObjectId(), name: 'étape 2', type: REMOTE },
    { _id: new ObjectId(), name: 'étape 3', type: E_LEARNING },
  ];

  const slotAddress = {
    street: '24 Avenue Daumesnil',
    fullAddress: '24 Avenue Daumesnil 75012 Paris',
    zipCode: '75012',
    city: 'Paris',
    location: { type: 'Point', coordinates: [2.37345, 48.848024] },
  };

  const courseSlotList = [
    {
      _id: new ObjectId(),
      course: courseList[0],
      startDate: '2021-05-01T08:00:00.000Z',
      endDate: '2021-05-01T10:00:00.000Z',
      createdAt: '2020-12-12T10:00:00.000Z',
      step: stepList[0],
      address: slotAddress,
      attendances: [{ trainee: traineeList[0]._id }],
    },
    {
      _id: new ObjectId(),
      course: courseList[0],
      startDate: '2021-05-01T14:00:00.000Z',
      endDate: '2021-05-01T16:00:00.000Z',
      createdAt: '2020-12-12T10:00:01.000Z',
      step: stepList[1],
      meetingLink: 'https://meet.google.com',
      attendances: [{ trainee: traineeList[0]._id }, { trainee: traineeList[1]._id }],
    },
    {
      _id: new ObjectId(),
      course: courseList[1],
      startDate: '2021-02-01T08:00:00.000Z',
      endDate: '2021-02-01T10:00:00.000Z',
      createdAt: '2020-12-12T10:00:02.000Z',
      step: stepList[0],
      address: slotAddress,
      attendances: [{ trainee: traineeList[1]._id }, { trainee: traineeList[3]._id }],
    },
    {
      _id: new ObjectId(),
      course: courseList[1],
      startDate: '2021-02-02T08:00:00.000Z',
      endDate: '2021-02-02T10:00:00.000Z',
      createdAt: '2020-12-12T10:00:03.000Z',
      step: stepList[2],
      attendances: [{ trainee: traineeList[1]._id }, { trainee: traineeList[3]._id }],
    },
  ];

  let findCourseSlot;

  beforeEach(() => {
    findCourseSlot = sinon.stub(CourseSlot, 'find');
  });

  afterEach(() => {
    findCourseSlot.restore();
  });

  it('should return an empty array if no course slots', async () => {
    findCourseSlot.returns(SinonMongoose.stubChainedQueries([]));

    const result = await ExportHelper.exportCourseSlotHistory('2021-01-14T23:00:00.000Z', '2022-01-20T22:59:59.000Z');

    expect(result).toEqual([[NO_DATA]]);
    SinonMongoose.calledOnceWithExactly(
      findCourseSlot,
      [
        {
          query: 'find',
          args: [{ startDate: { $lte: '2022-01-20T22:59:59.000Z' }, endDate: { $gte: '2021-01-14T23:00:00.000Z' } }],
        },
        { query: 'populate', args: [{ path: 'step', select: 'type name' }] },
        {
          query: 'populate',
          args: [{
            path: 'course',
            select: 'type trainees misc subProgram company',
            populate: [
              { path: 'company', select: 'name' },
              { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
            ],
          }],
        },
        { query: 'populate', args: [{ path: 'attendances' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return an array with the header and 4 rows', async () => {
    findCourseSlot.returns(SinonMongoose.stubChainedQueries(courseSlotList));

    const result = await ExportHelper.exportCourseSlotHistory('2021-01-14T23:00:00.000Z', '2022-01-20T22:59:59.000Z');

    expect(result).toEqual([
      [
        'Id Créneau',
        'Id Formation',
        'Formation',
        'Étape',
        'Type',
        'Date de création',
        'Date de début',
        'Date de fin',
        'Durée',
        'Adresse',
        'Nombre de présences',
        'Nombre d\'absences',
        'Nombre de présences non prévues',
      ],
      [
        courseSlotList[0]._id,
        courseIdList[0],
        'Enbonne Company - Program 1 - group 1',
        'étape 1',
        'présentiel',
        '12/12/2020 11:00:00',
        '01/05/2021 10:00:00',
        '01/05/2021 12:00:00',
        '2,00',
        '24 Avenue Daumesnil 75012 Paris',
        1,
        2,
        0,
      ],
      [
        courseSlotList[1]._id,
        courseIdList[0],
        'Enbonne Company - Program 1 - group 1',
        'étape 2',
        'distanciel',
        '12/12/2020 11:00:01',
        '01/05/2021 16:00:00',
        '01/05/2021 18:00:00',
        '2,00',
        'https://meet.google.com',
        2,
        1,
        0,
      ],
      [
        courseSlotList[2]._id,
        courseIdList[1],
        'Program 2 - group 2',
        'étape 1',
        'présentiel',
        '12/12/2020 11:00:02',
        '01/02/2021 09:00:00',
        '01/02/2021 11:00:00',
        '2,00',
        '24 Avenue Daumesnil 75012 Paris',
        1,
        1,
        1,
      ],
      [
        courseSlotList[3]._id,
        courseIdList[1],
        'Program 2 - group 2',
        'étape 3',
        'eLearning',
        '12/12/2020 11:00:03',
        '02/02/2021 09:00:00',
        '02/02/2021 11:00:00',
        '2,00',
        '',
        1,
        1,
        1,
      ],

    ]);
    SinonMongoose.calledOnceWithExactly(
      findCourseSlot,
      [
        {
          query: 'find',
          args: [{ startDate: { $lte: '2022-01-20T22:59:59.000Z' }, endDate: { $gte: '2021-01-14T23:00:00.000Z' } }],
        },
        { query: 'populate', args: [{ path: 'step', select: 'type name' }] },
        {
          query: 'populate',
          args: [{
            path: 'course',
            select: 'type trainees misc subProgram company',
            populate: [
              { path: 'company', select: 'name' },
              { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
            ],
          }],
        },
        { query: 'populate', args: [{ path: 'attendances' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('exportEndOfCourseQuestionnaireHistory', () => {
  const cards = [
    { _id: new ObjectId(), template: 'transition' },
    { _id: new ObjectId(), question: 'Ca va ?', template: 'open_question' },
    { _id: new ObjectId(), question: 'La famille ?', template: 'survey' },
    {
      _id: new ObjectId(),
      question: 'Les ami.es ?',
      template: 'question_answer',
      qcAnswers: [
        { _id: new ObjectId(), text: 'Oui' },
        { _id: new ObjectId(), text: 'Peut être' },
        { _id: new ObjectId(), text: 'Non' },
      ],
    },
  ];
  const questionnaire = {
    type: 'end_of_course',
    cards,
    histories: [
      { // 0 all questions answered
        _id: new ObjectId(),
        course: {
          _id: new ObjectId(),
          subProgram: { name: 'Je suis Présentiel', program: { name: 'Programme files' } },
          trainer: { identity: { firstname: 'Didier', lastname: 'Deschamps' } },
        },
        user: {
          _id: new ObjectId(),
          identity: { firstname: '', lastname: 'Zizou' },
          local: { email: 'zizou@2027.com' },
          contact: { phone: '0600000000' },
          company: { name: 'créole' },
        },
        questionnaire: {
          _id: new ObjectId(),
          type: 'end_of_course',
          cards,
        },
        questionnaireAnswersList: [
          { card: { _id: cards[1]._id }, answerList: ['Ouai oklm'] },
          { card: { _id: cards[2]._id }, answerList: ['5'] },
          {
            card: { _id: cards[3]._id, qcAnswers: cards[3].qcAnswers },
            answerList: [cards[3].qcAnswers[0]._id.toHexString(), cards[3].qcAnswers[1]._id.toHexString()],
          },
        ],
        createdAt: '2021-06-27T12:40:29.561Z',
        updatedAt: '2022-03-03T12:40:29.561Z',
      },
      { // 1 not all questions answered
        _id: new ObjectId(),
        course: {
          _id: new ObjectId(),
          subProgram: { name: 'JUST', program: { name: 'DO IT !' } },
          trainer: { identity: { firstname: 'Shia', lastname: 'labeouf' } },
        },
        user: {
          _id: new ObjectId(),
          identity: { firstname: 'Bob', lastname: 'Marley' },
          local: { email: 'bob@marley.com' },
          contact: {},
          company: { name: 'Reggae Music' },
        },
        questionnaire: {
          _id: new ObjectId(),
          type: 'end_of_course',
          cards,
        },
        questionnaireAnswersList: [
          {
            card: { _id: cards[3]._id, qcAnswers: cards[3].qcAnswers },
            answerList: [cards[3].qcAnswers[2]._id.toHexString()],
          },
          { card: { _id: cards[2]._id }, answerList: ['1'] },
        ],
        createdAt: '2021-06-30T12:40:29.561Z',
        updatedAt: '2022-03-03T12:40:29.561Z',
      },
    ],
  };
  let findOneQuestionnaire;

  beforeEach(() => {
    findOneQuestionnaire = sinon.stub(Questionnaire, 'findOne');
  });

  afterEach(() => {
    findOneQuestionnaire.restore();
  });

  it('should return an empty array if no questionnaire history', async () => {
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries({ cards, histories: [] }));
    const exportArray = await ExportHelper.exportEndOfCourseQuestionnaireHistory(
      '2021-06-25T12:00:00.000Z',
      '2021-06-30:12:00.000Z'
    );

    expect(exportArray).toEqual([['Aucune donnée sur la période sélectionnée']]);
  });

  it('should return an array with the header and 2 rows', async () => {
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries(questionnaire));

    const exportArray = await ExportHelper.exportEndOfCourseQuestionnaireHistory(
      '2021-06-25T12:00:00.000Z',
      '2021-06-30:12:00.000Z'
    );

    expect(exportArray).toEqual([
      [
        'Id formation',
        'Programme',
        'Sous-programme',
        'Prénom Nom intervenant(e)',
        'Structure',
        'Date de réponse',
        'Prénom Nom répondant(e)',
        'Mail répondant(e)',
        'Numéro de tél répondant(e)',
        'Ca va ?',
        'La famille ?',
        'Les ami.es ?',
      ],
      [
        questionnaire.histories[0].course._id,
        'Programme files',
        'Je suis Présentiel',
        'Didier DESCHAMPS',
        'créole',
        '27/06/2021 14:40:29',
        'ZIZOU',
        'zizou@2027.com',
        '0600000000',
        'Ouai oklm',
        '5',
        'Oui,Peut être',
      ],
      [
        questionnaire.histories[1].course._id,
        'DO IT !',
        'JUST',
        'Shia LABEOUF',
        'Reggae Music',
        '30/06/2021 14:40:29',
        'Bob MARLEY',
        'bob@marley.com',
        '',
        '', // no answer here
        '1',
        'Non',
      ],
    ]);
    SinonMongoose.calledOnceWithExactly(
      findOneQuestionnaire,
      [
        {
          query: 'findOne',
          args: [{ type: 'end_of_course' }],
        },
        { query: 'populate', args: [{ path: 'cards', select: 'question template' }] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { createdAt: { $gte: '2021-06-25T12:00:00.000Z', $lte: '2021-06-30:12:00.000Z' } },
            populate: [
              {
                path: 'course',
                select: 'subProgram',
                populate: [
                  { path: 'subProgram', select: 'name program', populate: { path: 'program', select: 'name' } },
                  { path: 'trainer', select: 'identity' },
                ],
              },
              {
                path: 'user',
                select: 'identity local.email contact.phone company',
                populate: { path: 'company', populate: { path: 'company', select: 'name' } },
              },
              { path: 'questionnaireAnswersList.card', select: 'qcAnswers' },
            ],
          }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });
});

describe('exportCourseBillAndCreditNoteHistory', () => {
  const subProgram = { _id: new ObjectId(), program: { name: 'Program 1' } };
  const courseId = new ObjectId();
  const company = { _id: new ObjectId(), name: 'Test SAS' };
  const course = { _id: courseId, subProgram, misc: 'group 1' };
  const courseBillList = [
    {
      course,
      mainFee: { price: 120, count: 1 },
      company,
      payer: { name: 'APA Paris' },
      billedAt: '2022-03-08T00:00:00.000Z',
      number: 'FACT-00001',
      courseCreditNote: { number: 'AV-00001', date: '2022-03-09T00:00:00.000Z' },
      coursePayments: [{ netInclTaxes: 10, nature: PAYMENT }],
    },
    {
      course,
      mainFee: { price: 120, count: 1 },
      company,
      payer: { name: 'APA Paris' },
      billedAt: '2022-03-08T00:00:00.000Z',
      number: 'FACT-00002',
      courseCreditNote: null,
      coursePayments: [{ netInclTaxes: 110, nature: PAYMENT }],
    },
  ];
  const credentials = { company: { _id: new ObjectId() }, role: { vendor: { name: TRAINING_ORGANISATION_MANAGER } } };
  const isVendorUser = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(get(credentials, 'role.vendor.name'));

  let findCourseBill;

  beforeEach(() => {
    findCourseBill = sinon.stub(CourseBill, 'find');
  });

  afterEach(() => {
    findCourseBill.restore();
  });

  it('should return an empty array if no course', async () => {
    findCourseBill.returns(SinonMongoose.stubChainedQueries([], ['populate', 'setOptions', 'lean']));

    const result = await ExportHelper.exportCourseBillAndCreditNoteHistory('2021-01-14T23:00:00.000Z', '2022-01-20T22:59:59.000Z', credentials);

    expect(result).toEqual([[NO_DATA]]);
    SinonMongoose.calledOnceWithExactly(
      findCourseBill,
      [
        {
          query: 'find',
          args: [{ billedAt: { $lte: '2022-01-20T22:59:59.000Z', $gte: '2021-01-14T23:00:00.000Z' } }],
        },
        {
          query: 'populate',
          args: [{
            path: 'course',
            select: 'subProgram misc',
            populate: { path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } },
          }],
        },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        { query: 'populate', args: [{ path: 'payer.company', select: 'name' }] },
        { query: 'populate', args: [{ path: 'payer.fundingOrganisation', select: 'name' }] },
        { query: 'populate', args: [{ path: 'courseCreditNote', select: 'number date', options: { isVendorUser } }] },
        {
          query: 'populate',
          args: [{ path: 'coursePayments', options: { isVendorUser }, select: 'netInclTaxes nature' }],
        },
        { query: 'setOptions', args: [{ isVendorUser }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return an array with the header and 3 rows', async () => {
    findCourseBill.returns(SinonMongoose.stubChainedQueries(courseBillList, ['populate', 'setOptions', 'lean']));

    const result = await ExportHelper
      .exportCourseBillAndCreditNoteHistory('2021-01-14T23:00:00.000Z', '2022-01-20T22:59:59.000Z', credentials);

    expect(result).toEqual([
      [
        'Nature',
        'Identifiant',
        'Date',
        'Id formation',
        'Formation',
        'Structure',
        'Payeur',
        'Montant TTC',
        'Montant réglé',
        'Avoir',
        'Montant soldé',
        'Solde',
      ],
      [
        'Facture',
        'FACT-00001',
        '08/03/2022',
        course._id,
        'Test SAS - Program 1 - group 1',
        'Test SAS',
        'APA Paris',
        '120,00',
        '10,00',
        'AV-00001',
        '120,00',
        '10,00',
      ],
      [
        'Avoir',
        'AV-00001',
        '09/03/2022',
        course._id,
        'Test SAS - Program 1 - group 1',
        'Test SAS',
        'APA Paris',
        '120,00',
        '',
        '',
        '',
        '',
      ],
      [
        'Facture',
        'FACT-00002',
        '08/03/2022',
        course._id,
        'Test SAS - Program 1 - group 1',
        'Test SAS',
        'APA Paris',
        '120,00',
        '110,00',
        '',
        '',
        '-10,00',
      ],
    ]);
    SinonMongoose.calledOnceWithExactly(
      findCourseBill,
      [
        {
          query: 'find',
          args: [{ billedAt: { $lte: '2022-01-20T22:59:59.000Z', $gte: '2021-01-14T23:00:00.000Z' } }],
        },
        {
          query: 'populate',
          args: [{
            path: 'course',
            select: 'subProgram misc',
            populate: { path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } },
          }],
        },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        { query: 'populate', args: [{ path: 'payer.company', select: 'name' }] },
        { query: 'populate', args: [{ path: 'payer.fundingOrganisation', select: 'name' }] },
        { query: 'populate', args: [{ path: 'courseCreditNote', select: 'number date', options: { isVendorUser } }] },
        {
          query: 'populate',
          args: [{ path: 'coursePayments', options: { isVendorUser }, select: 'netInclTaxes nature' }],
        },
        { query: 'setOptions', args: [{ isVendorUser }] },
        { query: 'lean' },
      ]
    );
  });
});