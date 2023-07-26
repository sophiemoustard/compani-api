const { expect } = require('expect');
const { groupBy, get, has, compact } = require('lodash');
const Activity = require('../../../src/models/Activity');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const Attendance = require('../../../src/models/Attendance');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const Card = require('../../../src/models/Card');
const CompanyHolding = require('../../../src/models/CompanyHolding');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const Contract = require('../../../src/models/Contract');
const Course = require('../../../src/models/Course');
const CourseBill = require('../../../src/models/CourseBill');
const CourseBillingItem = require('../../../src/models/CourseBillingItem');
const CourseBillsNumber = require('../../../src/models/CourseBillsNumber');
const CourseCreditNote = require('../../../src/models/CourseCreditNote');
const CourseCreditNoteNumber = require('../../../src/models/CourseCreditNoteNumber');
const CourseFundingOrganisation = require('../../../src/models/CourseFundingOrganisation');
const CoursePayment = require('../../../src/models/CoursePayment');
const CourseSlot = require('../../../src/models/CourseSlot');
const CourseHistory = require('../../../src/models/CourseHistory');
const Helper = require('../../../src/models/Helper');
const Program = require('../../../src/models/Program');
const Questionnaire = require('../../../src/models/Questionnaire');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const SectorHistory = require('../../../src/models/SectorHistory');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const UserHolding = require('../../../src/models/UserHolding');
const { ascendingSort } = require('../../../src/helpers/dates');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');
const { CompaniDuration } = require('../../../src/helpers/dates/companiDurations');
const { descendingSortBy, ascendingSortBy } = require('../../../src/helpers/dates/utils');
const UtilsHelper = require('../../../src/helpers/utils');
const UserCompaniesHelper = require('../../../src/helpers/userCompanies');
const {
  INTRA,
  COACH,
  TRAINEE_ADDITION,
  TRAINEE_DELETION,
  BLENDED,
  STRICTLY_E_LEARNING,
  INTER_B2B,
  INTER_B2C,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  CLIENT,
  VENDOR,
  DRAFT,
  E_LEARNING,
  PUBLISHED,
  FILL_THE_GAPS,
  SINGLE_CHOICE_QUESTION,
  QUESTION_ANSWER,
  ORDER_THE_SEQUENCE,
  MULTIPLE_CHOICE_QUESTION,
  SURVEY,
  TEXT_MEDIA,
  TITLE_TEXT_MEDIA,
  TITLE_TEXT,
  OPEN_QUESTION,
  TRANSITION,
  FLASHCARD,
  DD_MM_YYYY,
  TRAINER,
  SLOT_CREATION,
  SLOT_DELETION,
  ESTIMATED_START_DATE_EDITION,
  COMPANY_ADDITION,
  COMPANY_DELETION,
  SLOT_EDITION,
  CLIENT_ADMIN,
  ON_SITE,
  REMOTE,
  DAY,
  HOLDING_ADMIN,
  PAYMENT,
} = require('../../../src/helpers/constants');
const attendancesSeed = require('./attendancesSeed');
const activitiesSeed = require('./activitiesSeed');
const activityHistoriesSeed = require('./activityHistoriesSeed');
const attendanceSheetsSeed = require('./attendanceSheetsSeed');
const cardsSeed = require('./cardsSeed');
const companyLinkRequestsSeed = require('./companyLinkRequestsSeed');
const courseBillsSeed = require('./courseBillsSeed');
const courseBillingItemsSeed = require('./courseBillingItemsSeed');
const courseCreditNotesSeed = require('./courseCreditNotesSeed');
const courseFundingOrganisationsSeed = require('./courseFundingOrganisationsSeed');
const coursePaymentsSeed = require('./coursePaymentsSeed');
const coursesSeed = require('./coursesSeed');
const courseHistoriesSeed = require('./courseHistoriesSeed');
const courseSlotsSeed = require('./courseSlotsSeed');
const holdingsSeed = require('./holdingsSeed');
const programsSeed = require('./programsSeed');
const questionnairesSeed = require('./questionnairesSeed');
const questionnaireHistoriesSeed = require('./questionnaireHistoriesSeed');
const stepsSeed = require('./stepsSeed');
const subProgramsSeed = require('./subProgramsSeed');
const userCompaniesSeed = require('./userCompaniesSeed');
const usersSeed = require('./usersSeed');

const seedList = [
  { label: 'ACTIVITY', value: activitiesSeed },
  { label: 'ACTIVITYHISTORY', value: activityHistoriesSeed },
  { label: 'ATTENDANCE', value: attendancesSeed },
  { label: 'ATTENDANCESHEET', value: attendanceSheetsSeed },
  { label: 'CARD', value: cardsSeed },
  { label: 'COMPANYLINKREQUEST', value: companyLinkRequestsSeed },
  { label: 'COURSE', value: coursesSeed },
  { label: 'COURSEBILL', value: courseBillsSeed },
  { label: 'COURSEBILLINGITEM', value: courseBillingItemsSeed },
  { label: 'COURSECREDITNOTE', value: courseCreditNotesSeed },
  { label: 'COURSEFUNDINGORGANISATION', value: courseFundingOrganisationsSeed },
  { label: 'COURSEPAYMENT', value: coursePaymentsSeed },
  { label: 'COURSEHISTORY', value: courseHistoriesSeed },
  { label: 'COURSESLOT', value: courseSlotsSeed },
  { label: 'HOLDING', value: holdingsSeed },
  { label: 'PROGRAM', value: programsSeed },
  { label: 'QUESTIONNAIRE', value: questionnairesSeed },
  { label: 'QUESTIONNAIREHISTORY', value: questionnaireHistoriesSeed },
  { label: 'STEP', value: stepsSeed },
  { label: 'SUBPROGRAM', value: subProgramsSeed },
  { label: 'USERCOMPANY', value: userCompaniesSeed },
  { label: 'USER', value: usersSeed },
];

const transform = doc => (doc || null);

describe('SEEDS VERIFICATION', () => {
  seedList.forEach(({ label, value: seeds }) => {
    describe(`${label} SEEDS FILE`, () => {
      before(seeds.populateDB);

      describe('Collection Activity', () => {
        let activityList;
        before(async () => {
          activityList = await Activity
            .find()
            .populate({ path: 'cards', select: '-__v -createdAt -updatedAt', transform })
            .lean({ virtuals: true });
        });

        it('should pass if every card exists and is not duplicated', () => {
          const everyCardsExists = activityList.every(activity => activity.cards.every(card => card));

          expect(everyCardsExists).toBeTruthy();

          const someCardsAreDuplicated = activityList
            .some((activity) => {
              const cardsWithoutDuplicates = [...new Set(activity.cards.map(card => card._id.toHexString()))];

              return activity.cards.length !== cardsWithoutDuplicates.length;
            });

          expect(someCardsAreDuplicated).toBeFalsy();
        });

        it('should pass if published activities have at least one card', () => {
          const everyPublishedActivityHasCards = activityList
            .every(activity => activity.status === DRAFT || activity.cards.length);

          expect(everyPublishedActivityHasCards).toBeTruthy();
        });

        it('should pass if published activities have all their cards valid', () => {
          const everyPublishedActivityHasValidCards = activityList
            .every(activity => activity.status === DRAFT || activity.areCardsValid);

          expect(everyPublishedActivityHasValidCards).toBeTruthy();
        });
      });

      describe('Collection Activity History', () => {
        let activityHistoryList;
        before(async () => {
          activityHistoryList = await ActivityHistory
            .find()
            .populate({ path: 'user', select: '_id', transform })
            .populate({ path: 'activity', select: '_id cards', populate: { path: 'cards' }, transform })
            .populate({ path: 'questionnaireAnswersList.card', select: 'template', transform })
            .lean({ virtuals: true });
        });

        it('should pass if every user exists', () => {
          const everyUsersExists = activityHistoryList.every(ah => ah.user);

          expect(everyUsersExists).toBeTruthy();
        });

        it('should pass if user is registered to a course with the activity', async () => {
          const stepList = await Step
            .find({ activities: { $in: activityHistoryList.map(ah => ah.activity._id) } })
            .lean();
          const subProgramList = await SubProgram.find({ step: { $in: stepList.map(s => s._id) } }).lean();
          const courseList = await Course.find({ subProgram: { $in: subProgramList.map(sp => sp._id) } }).lean();

          const groupedStepsByActivity = groupBy(
            stepList.flatMap(s => s.activities.map(a => ({ ...s, activities: a }))),
            'activities'
          );
          const groupedSubProgramsByStep = groupBy(
            subProgramList.flatMap(sp => sp.steps.map(s => ({ ...sp, steps: s }))),
            'steps'
          );
          const groupedCoursesBySubProgram = groupBy(courseList, 'subProgram');
          const everyUserIsRegisteredToCourse = activityHistoryList
            .every(ah => groupedStepsByActivity[ah.activity._id]
              .some(step => groupedSubProgramsByStep[step._id]
                .some(subProgram => !!groupedCoursesBySubProgram[subProgram._id] &&
                    groupedCoursesBySubProgram[subProgram._id]
                      .some(course => UtilsHelper.doesArrayIncludeId(course.trainees, ah.user._id))
                )
              )
            );
          expect(everyUserIsRegisteredToCourse).toBeTruthy();
        });

        it('should pass if every activity exists', () => {
          const everyActivityExists = activityHistoryList.every(ah => ah.activity);

          expect(everyActivityExists).toBeTruthy();
        });

        it('should pass if every card exists and is in activity', () => {
          const everyCardExists = activityHistoryList.every(ah => ah.questionnaireAnswersList.every(qal => qal.card));

          expect(everyCardExists).toBeTruthy();

          const someCardsAreNotInActivities = activityHistoryList
            .some((ah) => {
              const cardIds = ah.activity.cards.map(c => c._id);

              return ah.questionnaireAnswersList.some(qal => !UtilsHelper.doesArrayIncludeId(cardIds, qal.card._id));
            });

          expect(someCardsAreNotInActivities).toBeFalsy();
        });

        it('should pass if every questionnaire answers list card is a questionnaire card', () => {
          const everyCardHasGoodTemplate = activityHistoryList
            .every(ah => ah.questionnaireAnswersList
              .every(qal => [SURVEY, OPEN_QUESTION, QUESTION_ANSWER].includes(qal.card.template)));

          expect(everyCardHasGoodTemplate).toBeTruthy();
        });

        it('should pass if every mandatory card has answer', () => {
          const everyMandatoryCardHasAnswer = activityHistoryList
            .every(ah => ah.activity.cards.every(c => !c.isMandatory ||
              ah.questionnaireAnswersList.some(qal => UtilsHelper.areObjectIdsEquals(c._id, qal.card._id)))
            );

          expect(everyMandatoryCardHasAnswer).toBeTruthy();
        });

        it('should pass if there is the good answers number', () => {
          const everyHistoryHasGoodAnswersNumber = activityHistoryList
            .every(ah => !ah.questionnaireAnswersList.length ||
              ah.questionnaireAnswersList
                .every(qal => qal.answerList.length === 1 || qal.card.template === QUESTION_ANSWER));

          expect(everyHistoryHasGoodAnswersNumber).toBeTruthy();
        });

        it('should pass if score is lower or equal to quizz cards count in activity', () => {
          const isScoreLowerOrEqualToQuizzCardsCount = activityHistoryList
            .every((ah) => {
              const quizzCardsTemplates = [
                FILL_THE_GAPS,
                MULTIPLE_CHOICE_QUESTION,
                SINGLE_CHOICE_QUESTION,
                ORDER_THE_SEQUENCE,
              ];
              const quizzCardsCount = ah.activity.cards.filter(c => quizzCardsTemplates.includes(c.template)).length;

              return (!quizzCardsCount && !has(ah, 'score')) || (ah.score <= quizzCardsCount);
            });

          expect(isScoreLowerOrEqualToQuizzCardsCount).toBeTruthy();
        });
      });

      describe('Collection Attendance', () => {
        let attendanceList;
        before(async () => {
          attendanceList = await Attendance
            .find()
            .populate({ path: 'trainee', select: 'id', populate: { path: 'userCompanyList' } })
            .populate({ path: 'courseSlot', select: '_id course', populate: { path: 'course', select: 'companies' } })
            .populate({ path: 'company', select: '_id' })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if every trainee exists', () => {
          const everyTraineeExists = attendanceList.every(a => a.trainee);

          expect(everyTraineeExists).toBeTruthy();
        });

        it('should pass if all attendance\'s trainee are in attendance\'s company', () => {
          const areTraineesInCompany = attendanceList
            .every(attendance => attendance.trainee.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, attendance.company._id))
            );
          expect(areTraineesInCompany).toBeTruthy();
        });

        it('should pass if every slot exists', () => {
          const everySlotExists = attendanceList.every(a => a.courseSlot);

          expect(everySlotExists).toBeTruthy();
        });

        it('should pass if every company exists', () => {
          const everyCompanyExists = attendanceList.every(a => a.company);

          expect(everyCompanyExists).toBeTruthy();
        });

        it('should pass if every company is rattached to course', () => {
          const everyCompanyIsInCourse = attendanceList
            .every(a => UtilsHelper.doesArrayIncludeId(a.courseSlot.course.companies, a.company._id));

          expect(everyCompanyIsInCourse).toBeTruthy();
        });
      });

      describe('Collection AttendanceSheet', () => {
        let attendanceSheetList;
        before(async () => {
          attendanceSheetList = await AttendanceSheet
            .find()
            .populate({ path: 'trainee', select: 'id', populate: { path: 'userCompanyList' } })
            .populate({
              path: 'course',
              select: '_id type companies',
              populate: { path: 'slots', select: 'startDate' },
            })
            .populate({ path: 'company', select: '_id' })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if every course exists', () => {
          const everyCourseExists = attendanceSheetList.every(a => a.course);

          expect(everyCourseExists).toBeTruthy();
        });

        it('should pass if only intra courses have date in attendance sheet', () => {
          const everyIntraAttendanceSheetHasDate = attendanceSheetList
            .every(a => a.course.type === INTER_B2B || a.date);

          expect(everyIntraAttendanceSheetHasDate).toBeTruthy();

          const someInterAttendanceSheetHasDate = attendanceSheetList
            .some(a => a.course.type === INTER_B2B && a.date);

          expect(someInterAttendanceSheetHasDate).toBeFalsy();
        });

        it('should pass if only inter courses have trainee in attendance sheet', () => {
          const everyTraineeExists = attendanceSheetList.every(a => a.course.type === INTRA || a.trainee);

          expect(everyTraineeExists).toBeTruthy();

          const someIntraAttendanceSheetHasTrainee = attendanceSheetList
            .some(a => a.course.type === INTRA && a.trainee);

          expect(someIntraAttendanceSheetHasTrainee).toBeFalsy();
        });

        it('should pass if attendance sheet dates are course slots dates', () => {
          const everySheetDateIsSlotDate = attendanceSheetList
            .filter(a => a.course.type === INTRA)
            .every((a) => {
              const slotsDates = a.course.slots.map(slot => CompaniDate(slot.startDate).format(DD_MM_YYYY));

              return slotsDates.includes(CompaniDate(a.date).format(DD_MM_YYYY));
            });

          expect(everySheetDateIsSlotDate).toBeTruthy();
        });

        it('should pass if all attendance sheet\'s trainee are in attendance sheet\'s company', () => {
          const areTraineesInCompany = attendanceSheetList
            .filter(attendanceSheet => attendanceSheet.trainee)
            .every(attendanceSheet => attendanceSheet.trainee.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, attendanceSheet.company._id))
            );
          expect(areTraineesInCompany).toBeTruthy();
        });

        it('should pass if every company exists', () => {
          const everyCompanyExists = attendanceSheetList.every(a => a.company);

          expect(everyCompanyExists).toBeTruthy();
        });

        it('should pass if every company is rattached to course', () => {
          const everyCompanyIsInCourse = attendanceSheetList
            .every(a => UtilsHelper.doesArrayIncludeId(a.course.companies, a.company._id));

          expect(everyCompanyIsInCourse).toBeTruthy();
        });
      });

      describe('Collection Card', () => {
        let cardList;
        before(async () => {
          cardList = await Card.find({}, { __v: 0, createdAt: 0, updatedAt: 0 }).lean();
        });

        const templateList = [
          {
            name: FILL_THE_GAPS,
            allowedKeys: ['gappedText', 'explanation', 'falsyGapAnswers', 'canSwitchAnswers'],
          },
          {
            name: SINGLE_CHOICE_QUESTION,
            allowedKeys: ['question', 'qcuGoodAnswer', 'qcAnswers', 'explanation'],
          },
          {
            name: QUESTION_ANSWER,
            allowedKeys: ['question', 'isQuestionAnswerMultipleChoiced', 'qcAnswers', 'isMandatory'],
          },
          {
            name: ORDER_THE_SEQUENCE,
            allowedKeys: ['question', 'orderedAnswers', 'explanation'],
          },
          {
            name: MULTIPLE_CHOICE_QUESTION,
            allowedKeys: ['question', 'qcAnswers', 'explanation'],
          },
          {
            name: SURVEY,
            allowedKeys: ['question', 'label.right', 'label.left', 'isMandatory'],
          },
          {
            name: TEXT_MEDIA,
            allowedKeys: ['text', 'media.link', 'media.publicId', 'media.type'],
          },
          {
            name: TITLE_TEXT_MEDIA,
            allowedKeys: ['text', 'title', 'media.link', 'media.publicId', 'media.type'],
          },
          {
            name: TITLE_TEXT,
            allowedKeys: ['text', 'title'],
          },
          {
            name: OPEN_QUESTION,
            allowedKeys: ['question', 'isMandatory'],
          },
          {
            name: TRANSITION,
            allowedKeys: ['title'],
          },
          {
            name: FLASHCARD,
            allowedKeys: ['text', 'backText'],
          },
        ];

        templateList.forEach((template) => {
          it(`should pass if every field in '${template.name}' card is allowed`, () => {
            const someKeysAreNotAllowed = cardList
              .filter(card => card.template === template.name)
              .some(card => UtilsHelper.getKeysOf2DepthObject(card)
                .filter(key => !['_id', 'template'].includes(key))
                .some(key => !template.allowedKeys.includes(key)));

            expect(someKeysAreNotAllowed).toBeFalsy();
          });
        });

        const keysWithTextSubKey = ['falsyGapAnswers', 'qcAnswers', 'orderedAnswers'];

        keysWithTextSubKey.forEach((key) => {
          it(`should pass if in '${key}' objects we have 'text'`, () => {
            const someSubKeysAreMissing = cardList
              .some(card => has(card, key) && card[key].some(object => !has(object, 'text')));

            expect(someSubKeysAreMissing).toBeFalsy();
          });
        });

        it('should pass if only \'multiple choice question\' card has correct key in \'qcAnswers\' field', () => {
          const someSubKeysAreWrong = cardList
            .some(card => card.template !== MULTIPLE_CHOICE_QUESTION && has(card, 'qcAnswers') &&
              card.qcAnswers.some(object => has(object, 'correct')));

          expect(someSubKeysAreWrong).toBeFalsy();
        });

        it('should pass if every card with \'label\' field contains \'right\' and \'left\' keys', () => {
          const someSubKeysAreMissing = cardList
            .some(card => has(card, 'label') && !(has(card, 'label.left') && has(card, 'label.right')));

          expect(someSubKeysAreMissing).toBeFalsy();
        });
      });

      describe('Collection CompanyHolding', () => {
        let companyHoldingList;
        before(async () => {
          companyHoldingList = await CompanyHolding
            .find()
            .populate({ path: 'holding', select: '_id' })
            .populate({ path: 'company', select: '_id' })
            .lean();
        });

        it('should pass if every company exists', () => {
          const companiesExist = companyHoldingList.map(ch => ch.company).every(company => !!company);
          expect(companiesExist).toBeTruthy();
        });

        it('should pass if every holding exists', () => {
          const holdingsExist = companyHoldingList.map(ch => ch.holding).every(holding => !!holding);
          expect(holdingsExist).toBeTruthy();
        });

        it('should pass if every company is linked to a single holding', () => {
          const companyIsLinkedToManyHoldings = companyHoldingList
            .some(companyHolding => companyHoldingList
              .filter(ch => UtilsHelper.areObjectIdsEquals(companyHolding.company._id, ch.company._id)).length > 1
            );
          expect(companyIsLinkedToManyHoldings).toBeFalsy();
        });
      });

      describe('Collection CompanyLinkRequest', () => {
        let companyLinkRequestList;
        before(async () => {
          companyLinkRequestList = await CompanyLinkRequest
            .find()
            .populate({ path: 'user', select: '_id', populate: { path: 'userCompanyList' } })
            .populate({ path: 'company', select: '_id', transform })
            .lean();
        });

        it('should pass if every user exists', () => {
          const usersExist = companyLinkRequestList.map(request => request.user).every(user => !!user);
          expect(usersExist).toBeTruthy();
        });

        it('should pass if every company exists', () => {
          const companiesExist = companyLinkRequestList.map(request => request.company).every(company => !!company);
          expect(companiesExist).toBeTruthy();
        });

        it('should pass if no user has or will have a company', () => {
          const doUsersAlreadyHaveCompany = companyLinkRequestList
            .some(request =>
              UserCompaniesHelper.getCurrentAndFutureCompanies(get(request.user, 'userCompanyList')).length
            );
          expect(doUsersAlreadyHaveCompany).toBeFalsy();
        });
      });

      describe('Collection Contract', () => {
        let contractList;
        before(async () => {
          contractList = await Contract
            .find()
            .populate({ path: 'user', select: '_id', populate: { path: 'userCompanyList' } })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if all users are in company at contrat startDate', () => {
          const areUsersInCompanyAtContractStartDate = contractList
            .every(contract => contract.user.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, contract.company) &&
                CompaniDate(contract.startDate).isSameOrAfter(uc.startDate)
              )
            );
          expect(areUsersInCompanyAtContractStartDate).toBeTruthy();
        });
      });

      describe('Collection Course', () => {
        let courseList;
        before(async () => {
          courseList = await Course
            .find()
            .populate({
              path: 'trainees',
              select: '_id',
              populate: { path: 'userCompanyList' },
              transform,
            })
            .populate({
              path: 'companyRepresentative',
              select: '_id',
              populate: [{ path: 'company' }, { path: 'role.client', select: 'name' }],
            })
            .populate({
              path: 'salesRepresentative',
              select: '_id',
              populate: [{ path: 'role.vendor', select: 'name' }],
            })
            .populate({ path: 'trainer', select: '_id role.vendor' })
            .populate({ path: 'companies', select: '_id', transform })
            .populate({ path: 'accessRules', select: '_id', transform })
            .populate({ path: 'subProgram', select: '_id' })
            .populate({ path: 'slots', select: 'endDate' })
            .populate({ path: 'slotsToPlan' })
            .lean();
        });

        it('should pass if all trainees are in course companies', () => {
          const isEveryTraineeCompanyAttachedToCourse = courseList
            .filter(course => course.format === BLENDED)
            .every(course => course.trainees
              .every(trainee => get(trainee, 'userCompanyList', [])
                .some(uc => UtilsHelper.doesArrayIncludeId(course.companies.map(c => get(c, '_id')), uc.company))
              ));
          expect(isEveryTraineeCompanyAttachedToCourse).toBeTruthy();
        });

        it('should pass if companyRepresentative is defined in intra course only', () => {
          const isCompanyRepresentativeOnlyInIntraCourses = courseList
            .every(c => !c.companyRepresentative || (c.companyRepresentative && c.type === INTRA));
          expect(isCompanyRepresentativeOnlyInIntraCourses).toBeTruthy();
        });

        it('should pass if companyRepresentative has good role', () => {
          const areCompanyRepresentativesCoachOrAdmin = courseList.every(c => !c.companyRepresentative ||
            [COACH, CLIENT_ADMIN].includes(get(c.companyRepresentative, 'role.client.name')));
          expect(areCompanyRepresentativesCoachOrAdmin).toBeTruthy();
        });

        it('should pass if companyRepresentative is in good company', () => {
          const areCoursesAndCompanyRepresentativesInSameCompany = courseList
            .every(c => !c.companyRepresentative ||
              UtilsHelper.areObjectIdsEquals(c.companyRepresentative.company, c.companies[0]._id));
          expect(areCoursesAndCompanyRepresentativesInSameCompany).toBeTruthy();
        });

        it('should pass if all trainees registered in restricted access courses are in good company', () => {
          const isEveryTraineeCompanyInAccessRules = courseList
            .filter(course => course.format === STRICTLY_E_LEARNING && get(course, 'accessRules.length'))
            .every(course => course.trainees
              .every(trainee => get(trainee, 'userCompanyList', [])
                .some(uc => UtilsHelper.doesArrayIncludeId(course.accessRules.map(c => get(c, '_id')), uc.company))
              ));
          expect(isEveryTraineeCompanyInAccessRules).toBeTruthy();
        });

        it('should pass if every access rules company exists and is not duplicated', () => {
          const coursesWithAccessRules = courseList.filter(c => c.accessRules.length);
          const everyCompanyExists = coursesWithAccessRules.every(c => c.accessRules.every(company => company));

          expect(everyCompanyExists).toBeTruthy();

          const someAccessRulesAreDuplicated = coursesWithAccessRules
            .some((course) => {
              const accessRulesWithoutDuplicates = [...new Set(course.accessRules.map(c => c._id.toHexString()))];

              return course.accessRules.length !== accessRulesWithoutDuplicates.length;
            });

          expect(someAccessRulesAreDuplicated).toBeFalsy();
        });

        it('should pass if every subprogram exists', () => {
          const subProgramsExist = courseList.map(course => course.subProgram).every(subProgram => !!subProgram);
          expect(subProgramsExist).toBeTruthy();
        });

        it('should pass if every company exists and is not duplicated', () => {
          const everyCompanyExists = courseList
            .filter(c => c.format === BLENDED)
            .every(c => c.companies.every(company => company));

          expect(everyCompanyExists).toBeTruthy();

          const someCompaniesAreDuplicated = courseList
            .filter(course => get(course, 'companies.length'))
            .some((course) => {
              const companiesWithoutDuplicates = [...new Set(course.companies.map(c => c._id.toHexString()))];

              return course.companies.length !== companiesWithoutDuplicates.length;
            });

          expect(someCompaniesAreDuplicated).toBeFalsy();
        });

        it('should pass if intra courses have one and only one company', () => {
          const everyIntraCourseHasCompany = courseList
            .filter(course => course.type === INTRA)
            .every(course => course.companies.length === 1);

          expect(everyIntraCourseHasCompany).toBeTruthy();
        });

        it('should pass if no e-learning course has companies field', () => {
          const noElearningCourseHasCompanies = courseList
            .filter(course => course.format === STRICTLY_E_LEARNING)
            .every(course => !has(course, 'companies'));
          expect(noElearningCourseHasCompanies).toBeTruthy();
        });

        it('should pass if no e-learning course has misc field', () => {
          const noELearningCourseHasMisc = courseList
            .filter(course => course.format === STRICTLY_E_LEARNING)
            .every(course => !has(course, 'misc'));
          expect(noELearningCourseHasMisc).toBeTruthy();
        });

        it('should pass if every blended course is intra ou inter_b2b', () => {
          const everyBlendedCourseHasGoodType = courseList
            .filter(course => course.format === BLENDED)
            .every(course => [INTRA, INTER_B2B].includes(course.type));

          expect(everyBlendedCourseHasGoodType).toBeTruthy();
        });

        it('should pass if every strictly e-learning course is inter_b2c', () => {
          const everyELearningCourseHasGoodType = courseList
            .filter(course => course.format === STRICTLY_E_LEARNING)
            .every(course => course.type === INTER_B2C);

          expect(everyELearningCourseHasGoodType).toBeTruthy();
        });

        it('should pass if trainer is never in trainees list', () => {
          const isTrainerIncludedInTrainees = courseList
            .some(c => has(c, 'trainer') &&
              UtilsHelper.doesArrayIncludeId(c.trainees.map(t => get(t, '_id')), c.trainer._id));
          expect(isTrainerIncludedInTrainees).toBeFalsy();
        });

        it('should pass if every trainee exists and is not duplicated', () => {
          const everyTraineeExists = courseList.every(c => c.trainees.every(trainee => trainee));

          expect(everyTraineeExists).toBeTruthy();

          const someTraineesAreDuplicated = courseList
            .some((course) => {
              const traineesWithoutDuplicates = [...new Set(course.trainees.map(t => t._id.toHexString()))];

              return course.trainees.length !== traineesWithoutDuplicates.length;
            });

          expect(someTraineesAreDuplicated).toBeFalsy();
        });

        it('should pass if trainer has good role', () => {
          const haveTrainersVendorRole = courseList.every(c => !has(c, 'trainer') || has(c.trainer, 'role.vendor'));
          expect(haveTrainersVendorRole).toBeTruthy();
        });

        it('should pass if contact is trainer, company representative or sales representative', () => {
          const isContactGoodUser = courseList
            .filter(c => has(c, 'contact'))
            .every((c) => {
              const acceptedUsers = compact([
                get(c, 'salesRepresentative._id'),
                get(c, 'trainer._id'),
                get(c, 'companyRepresentative._id'),
              ]);

              return UtilsHelper.doesArrayIncludeId(acceptedUsers, c.contact);
            });
          expect(isContactGoodUser).toBeTruthy();
        });

        it('should pass if no access rules for blended courses', () => {
          const noBlendedCourseHasAccessRules = courseList.every(c => c.format !== BLENDED || !c.accessRules.length);
          expect(noBlendedCourseHasAccessRules).toBeTruthy();
        });

        it('should pass if only blended courses have interlocutors', () => {
          const doELearningCoursesHaveInterlocutors = courseList
            .some(c => c.format === STRICTLY_E_LEARNING &&
              (c.salesRepresentative || c.trainer || c.companyRepresentative));
          expect(doELearningCoursesHaveInterlocutors).toBeFalsy();
        });

        it('should pass if all sales representative are rof or vendor admin', () => {
          const doAllSalesRepresentativeHaveGoodRole = courseList
            .filter(c => c.salesRepresentative)
            .every(c => [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN]
              .includes(get(c.salesRepresentative, 'role.vendor.name')));
          expect(doAllSalesRepresentativeHaveGoodRole).toBeTruthy();
        });

        it('should pass if estimated start date is defined for blended courses only', () => {
          const doELearningCoursesHaveEstimatedStartDate = courseList
            .some(c => c.format === STRICTLY_E_LEARNING && c.estimatedStartDate);
          expect(doELearningCoursesHaveEstimatedStartDate).toBeFalsy();
        });

        it('should pass if archive date is defined for blended courses only', () => {
          const doELearningCoursesHaveArchiveDate = courseList
            .some(c => c.format === STRICTLY_E_LEARNING && c.archivedAt);
          expect(doELearningCoursesHaveArchiveDate).toBeFalsy();
        });

        it('should pass if archive date is always after last slot', () => {
          const isArchiveDateAfterLastSlot = courseList
            .every((c) => {
              if (!c.archivedAt || !c.slots.length) return true;
              const lastSlot = c.slots[c.slots.length - 1];

              return CompaniDate(c.archivedAt).isAfter(lastSlot.endDate);
            });
          expect(isArchiveDateAfterLastSlot).toBeTruthy();
        });

        it('should pass if max trainees is defined only for intra courses', () => {
          const isMaxTraineesDefinedForIntraCoursesOnly = courseList
            .every(c => c.type === INTRA || !has(c, 'maxTrainees'));
          expect(isMaxTraineesDefinedForIntraCoursesOnly).toBeTruthy();
        });

        it('should pass if number of trainees is lower than max trainees', () => {
          const isNumberOfTraineesLowerThanMaxTrainees = courseList
            .every(c => !c.maxTrainees || c.trainees.length <= c.maxTrainees);
          expect(isNumberOfTraineesLowerThanMaxTrainees).toBeTruthy();
        });

        it('should pass if expected bills count is defined only for blended courses', () => {
          const isExpectedBillsCountDefinedForBlendedCoursesOnly = courseList
            .every(c => c.format === BLENDED || !has(c, 'expectedBillsCount'));
          expect(isExpectedBillsCountDefinedForBlendedCoursesOnly).toBeTruthy();
        });

        it('should pass if every interlocutor exists', () => {
          const everyUserExists = courseList.every((c) => {
            const userList = [
              ...(has(c, 'companyRepresentative') ? [c.companyRepresentative] : []),
              ...(has(c, 'salesRepresentative') ? [c.salesRepresentative] : []),
              ...(has(c, 'trainer') ? [c.trainer] : []),
            ];

            return userList.every(u => u);
          });

          expect(everyUserExists).toBeTruthy();
        });
      });

      describe('Collection CourseBill', () => {
        let courseBillList;
        before(async () => {
          courseBillList = await CourseBill
            .find()
            .populate({ path: 'course', select: 'format companies type expectedBillsCount', transform })
            .populate({ path: 'company', transform })
            .populate({ path: 'payer.company', transform })
            .populate({ path: 'payer.fundingOrganisation', transform })
            .populate({
              path: 'billingPurchaseList',
              select: 'billingItem',
              populate: { path: 'billingItem', transform },
            })
            .populate({ path: 'courseCreditNote', options: { allCompanies: true } })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if every course exists and is blended', () => {
          const everyCourseIsBlended = courseBillList.every(bill => get(bill, 'course.format') === BLENDED);

          expect(everyCourseIsBlended).toBeTruthy();
        });

        it('should pass if every price is positive', () => {
          const everyPriceIsValid = courseBillList.every(bill => bill.mainFee.price > 0);

          expect(everyPriceIsValid).toBeTruthy();
        });

        it('should pass if every count is a positive integer', () => {
          const everyCountIsAValidInteger = courseBillList
            .every(bill => bill.mainFee.count > 0 && Number.isInteger(bill.mainFee.count));

          expect(everyCountIsAValidInteger).toBeTruthy();
        });

        it('should pass if every company exists', () => {
          const everyCompanyExists = courseBillList.every(bill => !!bill.company);

          expect(everyCompanyExists).toBeTruthy();
        });

        it('should pass if every company is linked to course', () => {
          const everyCompanyIsLinkedToCourse = courseBillList
            .every(bill => UtilsHelper.doesArrayIncludeId(bill.course.companies, bill.company._id));

          expect(everyCompanyIsLinkedToCourse).toBeTruthy();
        });

        it('should pass if every payer exists', () => {
          const everyPayerExists = courseBillList.every(bill => !!bill.payer._id);

          expect(everyPayerExists).toBeTruthy();
        });

        it('should pass if every billing item exists', () => {
          const everyBillingItemExists = courseBillList
            .every(bill => bill.billingPurchaseList.every(purchase => !!purchase.billingItem));

          expect(everyBillingItemExists).toBeTruthy();
        });

        it('should pass if every billing purchase price is positive', () => {
          const everyPriceIsValid = courseBillList
            .every(bill => bill.billingPurchaseList.every(purchase => purchase.price > 0));

          expect(everyPriceIsValid).toBeTruthy();
        });

        it('should pass if every billing purchase count is a positive integer', () => {
          const everyCountIsAValidInteger = courseBillList
            .every(bill => bill.billingPurchaseList
              .every(purchase => purchase.count > 0 && Number.isInteger(purchase.count)));

          expect(everyCountIsAValidInteger).toBeTruthy();
        });

        it('should pass if every number has good format', () => {
          const everyNumberHasGoodFormat = courseBillList
            .every(bill => !bill.number || bill.number.match(/^FACT-[0-9]{5}$/));

          expect(everyNumberHasGoodFormat).toBeTruthy();
        });

        it('should pass if every number is unique', () => {
          const courseBillNumberList = compact(courseBillList.map(bill => bill.number));
          const courseBillNumbersWithoutDuplicates = [...new Set(courseBillNumberList)];

          expect(courseBillNumbersWithoutDuplicates.length).toEqual(courseBillNumberList.length);
        });

        it('should pass if no more active bill than expected', () => {
          const courseBillGroupedByCourse = groupBy(courseBillList, 'course._id');
          const everyBillCountIsLowerThanExpected = Object.keys(courseBillGroupedByCourse)
            .every((courseId) => {
              const { course } = courseBillGroupedByCourse[courseId][0];
              if (course.type !== INTRA) return true;

              const activeBills = courseBillGroupedByCourse[courseId].filter(b => !b.courseCreditNote);

              return activeBills.length <= course.expectedBillsCount;
            });

          expect(everyBillCountIsLowerThanExpected).toBeTruthy();
        });
      });

      describe('Collection CourseBillingItem', () => {
        let courseBillingItemList;
        before(async () => {
          courseBillingItemList = await CourseBillingItem.find().lean();
        });

        it('should pass if every name is unique', () => {
          const courseBillingItemNameList = courseBillingItemList.map(item => item.name);
          const courseBillingItemNamesWithoutDuplicates = [...new Set(courseBillingItemNameList)];

          expect(courseBillingItemNamesWithoutDuplicates.length).toEqual(courseBillingItemNameList.length);
        });
      });

      describe('Collection CourseBillsNumber', () => {
        let courseBillsNumberList;
        before(async () => {
          courseBillsNumberList = await CourseBillsNumber.find().lean();
        });

        it('should pass if only one item in list', () => {
          expect(courseBillsNumberList.length).toBeLessThanOrEqual(1);
        });

        it('should pass if value is a positive integer', () => {
          const isCourseBillsNumberAPositiveInteger = !courseBillsNumberList.length ||
            (courseBillsNumberList[0].seq > 0 && Number.isInteger(courseBillsNumberList[0].seq));

          expect(isCourseBillsNumberAPositiveInteger).toBeTruthy();
        });

        it('should pass if course bill number has good value', async () => {
          const courseBillCount = await CourseBill.countDocuments({ billedAt: { $exists: true } });

          if (!courseBillCount) expect(courseBillsNumberList.length).toEqual(0);
          else expect(courseBillsNumberList[0].seq).toEqual(courseBillCount);
        });
      });

      describe('Collection CourseCreditNote', () => {
        let courseCreditNoteList;
        before(async () => {
          courseCreditNoteList = await CourseCreditNote
            .find()
            .populate({ path: 'courseBill', select: 'company billedAt', transform })
            .populate({ path: 'company', transform })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if every number has good format', () => {
          const everyNumberHasGoodFormat = courseCreditNoteList
            .every(creditNote => creditNote.number.match(/^AV-[0-9]{5}$/));

          expect(everyNumberHasGoodFormat).toBeTruthy();
        });

        it('should pass if every course bill exists', () => {
          const everyCourseBillExists = courseCreditNoteList.every(creditNote => !!creditNote.courseBill);

          expect(everyCourseBillExists).toBeTruthy();
        });

        it('should pass if every course credit note has good company', () => {
          const everyCompanyExists = courseCreditNoteList.every(creditNote => !!creditNote.company);

          expect(everyCompanyExists).toBeTruthy();

          const everyCompanyIsInCourseBill = courseCreditNoteList
            .every(creditNote => UtilsHelper.areObjectIdsEquals(creditNote.company._id, creditNote.courseBill.company));

          expect(everyCompanyIsInCourseBill).toBeTruthy();
        });

        it('should pass if every date is after billing', () => {
          const everyCourseBillIsBilled = courseCreditNoteList.every(creditNote => !!creditNote.courseBill.billedAt);

          expect(everyCourseBillIsBilled).toBeTruthy();

          const everyDateIsAfterBilling = courseCreditNoteList
            .every(creditNote => CompaniDate(creditNote.date).isAfter(creditNote.courseBill.billedAt));

          expect(everyDateIsAfterBilling).toBeTruthy();
        });
      });

      describe('Collection CourseCreditNoteNumber', () => {
        let courseCreditNoteNumberList;
        before(async () => {
          courseCreditNoteNumberList = await CourseCreditNoteNumber.find().lean();
        });

        it('should pass if only one item in list', () => {
          expect(courseCreditNoteNumberList.length).toBeLessThanOrEqual(1);
        });

        it('should pass if value is a positive integer', () => {
          const isCourseCreditNoteNumberAPositiveInteger = !courseCreditNoteNumberList.length ||
            (courseCreditNoteNumberList[0].seq > 0 && Number.isInteger(courseCreditNoteNumberList[0].seq));

          expect(isCourseCreditNoteNumberAPositiveInteger).toBeTruthy();
        });

        it('should pass if credit note number has good value', async () => {
          const courseCreditNoteCount = await CourseCreditNote.countDocuments();

          if (!courseCreditNoteCount) expect(courseCreditNoteNumberList.length).toEqual(0);
          else expect(courseCreditNoteNumberList[0].seq).toEqual(courseCreditNoteCount);
        });
      });

      describe('Collection CourseFundingOrganisation', () => {
        let courseFundingOrganisationsList;
        before(async () => {
          courseFundingOrganisationsList = await CourseFundingOrganisation.find().lean();
        });

        it('should pass if name is unique', () => {
          const organisationNameList = compact(courseFundingOrganisationsList.map(o => o.name.toLowerCase()));
          const organisationNamesWithoutDuplicates = [...new Set(organisationNameList)];

          expect(organisationNamesWithoutDuplicates.length).toEqual(courseFundingOrganisationsList.length);
        });
      });

      describe('Collection CoursePayment', () => {
        let coursePaymentList;
        before(async () => {
          coursePaymentList = await CoursePayment
            .find()
            .populate({ path: 'courseBill', select: 'company billedAt', transform })
            .populate({ path: 'company', transform })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if every number has good format', () => {
          const everyNumberHasGoodFormat = coursePaymentList
            .every(creditNote => creditNote.number.match(/^(REG|REMB)-[0-9]{5}$/));

          expect(everyNumberHasGoodFormat).toBeTruthy();
        });

        it('should pass if every course bill exists', () => {
          const everyCourseBillExists = coursePaymentList.every(payment => !!payment.courseBill);

          expect(everyCourseBillExists).toBeTruthy();
        });

        it('should pass if every course payment has good company', () => {
          const everyCompanyExists = coursePaymentList.every(payment => !!payment.company);

          expect(everyCompanyExists).toBeTruthy();

          const everyCompanyIsInCourseBill = coursePaymentList
            .every(payment => UtilsHelper.areObjectIdsEquals(payment.company._id, payment.courseBill.company));

          expect(everyCompanyIsInCourseBill).toBeTruthy();
        });

        it('should pass if every date is after billing', () => {
          const everyCourseBillIsBilled = coursePaymentList.every(payment => !!payment.courseBill.billedAt);

          expect(everyCourseBillIsBilled).toBeTruthy();

          const everyDateIsAfterBilling = coursePaymentList
            .every(payment => CompaniDate(payment.date).isAfter(payment.courseBill.billedAt));

          expect(everyDateIsAfterBilling).toBeTruthy();
        });

        it('should pass if nature is consistent with number', () => {
          const everyNatureIsConsistent = coursePaymentList.every((payment) => {
            if (payment.nature === PAYMENT) return payment.number.match(/^REG-[0-9]{5}$/);
            return payment.number.match(/^REMB-[0-9]{5}$/);
          });

          expect(everyNatureIsConsistent).toBeTruthy();
        });
      });

      describe('Collection CourseSlot', () => {
        let courseSlotList;
        before(async () => {
          courseSlotList = await CourseSlot
            .find()
            .populate({
              path: 'course',
              select: 'format subProgram',
              populate: { path: 'subProgram', select: 'steps' },
              transform,
            })
            .populate({ path: 'step', select: 'type', transform })
            .lean();
        });

        it('should pass if every course exists and is blended', () => {
          const everyCourseIsBlended = courseSlotList.every(cs => cs.course && cs.course.format === BLENDED);
          expect(everyCourseIsBlended).toBeTruthy();
        });

        it('should pass if every startDate is before endDate and same day', () => {
          const everyStartDateIsBeforeEndDateInTheDay = courseSlotList
            .every(cs => !has(cs, 'startDate') ||
              (CompaniDate(cs.startDate).isBefore(cs.endDate) &&
                CompaniDate(cs.startDate).isSame(CompaniDate(cs.endDate), DAY))
            );
          expect(everyStartDateIsBeforeEndDateInTheDay).toBeTruthy();
        });

        it('should pass if addresses are on site slots only', () => {
          const areAddressesOnSiteSlotsOnly = courseSlotList
            .every(cs => !has(cs, 'address') || cs.step.type === ON_SITE);
          expect(areAddressesOnSiteSlotsOnly).toBeTruthy();
        });

        it('should pass if links are on remote slots only', () => {
          const areLinksOnRemoteSlotsOnly = courseSlotList
            .every(cs => !has(cs, 'meetingLink') || cs.step.type === REMOTE);
          expect(areLinksOnRemoteSlotsOnly).toBeTruthy();
        });

        it('should pass if step exists and is in course', () => {
          const everyStepIsInCourse = courseSlotList
            .every(cs => cs.step && UtilsHelper.doesArrayIncludeId(cs.course.subProgram.steps, cs.step._id));
          expect(everyStepIsInCourse).toBeTruthy();
        });
      });

      describe('Collection CourseHistory', () => {
        let courseHistoryList;
        before(async () => {
          courseHistoryList = await CourseHistory
            .find({})
            .populate({ path: 'trainee', select: '_id', transform, populate: { path: 'userCompanyList' } })
            .populate({ path: 'company', select: '_id', transform })
            .populate({
              path: 'createdBy',
              select: '_id role',
              transform,
              populate: [
                { path: 'role.vendor', select: 'name' },
                { path: 'role.client', select: 'name' },
                { path: 'userCompanyList' },
              ],
            })
            .populate({ path: 'course', select: 'trainer companies trainees' })
            .lean();
        });

        it('should pass if user who created history exists', () => {
          const everyHistoryCreatorExists = courseHistoryList.every(ch => !!ch.createdBy);
          expect(everyHistoryCreatorExists).toBeTruthy();
        });

        it('should pass if user who created history has good role', () => {
          const everyHistoryCreatorHasGoodRole = courseHistoryList.every((ch) => {
            const rofOrVendorAdminActions = [
              SLOT_CREATION,
              ESTIMATED_START_DATE_EDITION,
              COMPANY_ADDITION,
              COMPANY_DELETION,
            ];
            const otherActions = [
              SLOT_DELETION,
              SLOT_EDITION,
              TRAINEE_ADDITION,
              TRAINEE_DELETION,
            ];

            const hasRofOrVendorAdminRole = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN]
              .includes(get(ch.createdBy, 'role.vendor.name'));
            const hasCourseEditionRole = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN, TRAINER]
              .includes(get(ch.createdBy, 'role.vendor.name')) ||
              [COACH, CLIENT_ADMIN].includes(get(ch.createdBy, 'role.client.name'));

            if (rofOrVendorAdminActions.includes(ch.action) && !hasRofOrVendorAdminRole) return false;
            if (otherActions.includes(ch.action) && !hasCourseEditionRole) return false;

            return true;
          });
          expect(everyHistoryCreatorHasGoodRole).toBeTruthy();
        });

        it('should pass if user who created history is allowed to access course', () => {
          const everyHistoryCreatorIsAllowedToAccessCourse = courseHistoryList.every((ch) => {
            const hasRofOrVendorAdminRole = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN]
              .includes(get(ch.createdBy, 'role.vendor.name'));

            const isCourseTrainer = get(ch.createdBy, 'role.vendor.name') === TRAINER &&
              UtilsHelper.areObjectIdsEquals(ch.createdBy._id, ch.course.trainer);

            const isFromCompanyLinkedToCourse = [COACH, CLIENT_ADMIN].includes(get(ch.createdBy, 'role.client.name')) &&
              ch.course.type === INTRA &&
              ch.createdBy.userCompanyList.some(uc => UtilsHelper.doesArrayIncludeId(ch.course.companies, uc.company));

            if (hasRofOrVendorAdminRole || isCourseTrainer || isFromCompanyLinkedToCourse) return true;

            return false;
          });
          expect(everyHistoryCreatorIsAllowedToAccessCourse).toBeTruthy();
        });

        it('should pass if trainee is in course for trainee_addition action', () => {
          const isEveryTraineeInCourse = courseHistoryList
            .filter(ch => ch.action === TRAINEE_ADDITION)
            .every((ch) => {
              if (UtilsHelper.doesArrayIncludeId(ch.course.trainees, ch.trainee._id)) return true;

              const traineeDeletions = courseHistoryList
                .filter(
                  history => history.action === TRAINEE_DELETION &&
                  UtilsHelper.areObjectIdsEquals(history.trainee._id, ch.trainee._id) &&
                  UtilsHelper.areObjectIdsEquals(history.course._id, ch.course._id)
                );

              const traineeAdditions = courseHistoryList
                .filter(
                  history => history.action === TRAINEE_ADDITION &&
                  UtilsHelper.areObjectIdsEquals(history.trainee._id, ch.trainee._id) &&
                  UtilsHelper.areObjectIdsEquals(history.course._id, ch.course._id)
                );

              return traineeDeletions.length === traineeAdditions.length;
            });

          expect(isEveryTraineeInCourse).toBeTruthy();
        });

        it('should pass if course exists', () => {
          const everyCourseExists = courseHistoryList.every(ch => !!ch.course);
          expect(everyCourseExists).toBeTruthy();
        });

        it('should pass if none history has address and meeting link fields', () => {
          const someHistoryHaveAddressAndMeetingLink = courseHistoryList
            .filter(ch => has(ch, 'slot'))
            .some(ch => ch.slot.address && ch.slot.meetingLink);

          expect(someHistoryHaveAddressAndMeetingLink).toBeFalsy();
        });

        it('should pass if startDate is before endDate', () => {
          const everyStartDateIsBeforeEndDate = courseHistoryList
            .every(ch => !has(ch, 'slot') || CompaniDate(ch.slot.startDate).isBefore(ch.slot.endDate));

          expect(everyStartDateIsBeforeEndDate).toBeTruthy();
        });

        it('should pass if histories with slot have good action', () => {
          const everyHistoryWithSlotHasGoodAction = courseHistoryList
            .every(ch => !has(ch, 'slot') || [SLOT_CREATION, SLOT_DELETION, SLOT_EDITION].includes(ch.action));

          expect(everyHistoryWithSlotHasGoodAction).toBeTruthy();
        });

        it('should pass if startHour is before endHour', () => {
          const everyStartDateIsBeforeEndDate = courseHistoryList
            .every(ch => !has(ch, 'update') || CompaniDate(ch.update.startHour.to).isBefore(ch.update.endHour.to));

          expect(everyStartDateIsBeforeEndDate).toBeTruthy();
        });

        it('should pass if estimatedStartDate is the only field in update and has good action', () => {
          const everyStartDateIsBeforeEndDate = courseHistoryList
            .every(ch => !has(ch, 'update.estimatedStartDate') ||
              (Object.keys(ch.update).length === 1 && ch.action === ESTIMATED_START_DATE_EDITION));

          expect(everyStartDateIsBeforeEndDate).toBeTruthy();
        });

        it('should pass if trainee exists', () => {
          const everyTraineeExists = courseHistoryList
            .every(ch => ![TRAINEE_ADDITION, TRAINEE_DELETION].includes(ch.action) || !!ch.trainee);
          expect(everyTraineeExists).toBeTruthy();
        });

        it('should pass if all trainees are in course company at registration', () => {
          const traineeHistoryList = courseHistoryList
            .filter(ch => [TRAINEE_ADDITION, TRAINEE_DELETION].includes(ch.action));
          const courseHistoriesGroupedByCourse = groupBy(traineeHistoryList, 'course._id');

          for (const courseHistories of Object.values(courseHistoriesGroupedByCourse)) {
            const courseHistoriesGroupedByTrainee = groupBy(courseHistories, 'trainee._id');

            for (const traineeCourseHistories of Object.values(courseHistoriesGroupedByTrainee)) {
              const lastHistory = traineeCourseHistories.sort(descendingSortBy('createdAt'))[0];
              const isTraineeInCompanyBeforeAction = traineeCourseHistories.sort(ascendingSortBy('createdAt'))
                .every((ch, i) => {
                  if (i % 2 === 0) {
                    return ch.action === TRAINEE_ADDITION && ch.trainee.userCompanyList
                      .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, ch.company._id));
                  }

                  return ch.action === TRAINEE_DELETION;
                });
              expect(isTraineeInCompanyBeforeAction).toBeTruthy();

              const isLastHistoryAddition = lastHistory.action === TRAINEE_ADDITION;

              let isTraineeStillInCompanyAtRegistration = true;
              if (isLastHistoryAddition) {
                isTraineeStillInCompanyAtRegistration = lastHistory.trainee.userCompanyList.some(uc =>
                  UtilsHelper.areObjectIdsEquals(uc.company, lastHistory.company._id) &&
                    (!uc.endDate || CompaniDate(lastHistory.createdAt).isBefore(uc.endDate))
                );
              }

              expect(!isLastHistoryAddition || isTraineeStillInCompanyAtRegistration).toBeTruthy();
            }
          }
        });

        it('should pass if company exists', () => {
          const everyCompanyExists = courseHistoryList
            .every(ch => ![COMPANY_ADDITION, COMPANY_DELETION, TRAINEE_ADDITION].includes(ch.action) || !!ch.company);
          expect(everyCompanyExists).toBeTruthy();
        });

        it('should pass if company is in course', () => {
          const everyCompanyExists = courseHistoryList
            .every((ch) => {
              if (![COMPANY_ADDITION, TRAINEE_ADDITION].includes(ch.action)) return true;

              const isCompanyInCourse = UtilsHelper.doesArrayIncludeId(ch.course.companies, ch.company._id);

              const companyDeletions = courseHistoryList
                .filter(
                  history => history.action === COMPANY_DELETION &&
                  UtilsHelper.areObjectIdsEquals(history.company._id, ch.company._id) &&
                  UtilsHelper.areObjectIdsEquals(history.course._id, ch.course._id)
                );

              const companyAdditions = courseHistoryList
                .filter(
                  history => history.action === COMPANY_ADDITION &&
                  UtilsHelper.areObjectIdsEquals(history.company._id, ch.company._id) &&
                  UtilsHelper.areObjectIdsEquals(history.course._id, ch.course._id)
                );

              const hasCompanyBeenRemoved = companyDeletions.length === companyAdditions.length;

              return isCompanyInCourse || hasCompanyBeenRemoved;
            });
          expect(everyCompanyExists).toBeTruthy();
        });
      });

      describe('Collection Helper', () => {
        let helperList;
        before(async () => {
          helperList = await Helper
            .find()
            .populate({ path: 'user', select: '_id', populate: { path: 'userCompanyList' } })
            .populate({ path: 'company', select: '_id' })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if every company exists', () => {
          const companiesExist = helperList.map(helper => helper.company).every(company => !!company);
          expect(companiesExist).toBeTruthy();
        });

        it('should pass if every user exists', () => {
          const usersExist = helperList.map(helper => helper.user).every(user => !!user);
          expect(usersExist).toBeTruthy();
        });

        it('should pass if every helper has a matching user and company', () => {
          const areUserAndCompanyMatching = helperList
            .every(helper => helper.user.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, helper.company._id))
            );
          expect(areUserAndCompanyMatching).toBeTruthy();
        });
      });

      describe('Collection Program', () => {
        let programList;
        before(async () => {
          programList = await Program
            .find()
            .populate({ path: 'subPrograms', select: '_id', transform })
            .populate({ path: 'categories', select: '_id', transform })
            .populate({
              path: 'testers',
              select: '_id',
              transform,
              populate: { path: 'role.vendor', select: 'name' },
            })
            .lean();
        });

        it('should pass if every subprogram exists and is not duplicated in same or different program', () => {
          const everySubProgramExists = programList.every(p => p.subPrograms.every(subProgram => subProgram));

          expect(everySubProgramExists).toBeTruthy();

          const subProgramsList = programList
            .flatMap(program => program.subPrograms.map(sp => sp._id.toHexString()));
          const subProgramsWithoutDuplicates = [...new Set(subProgramsList)];

          expect(subProgramsWithoutDuplicates.length).toEqual(subProgramsList.length);
        });

        it('should pass if every category exists and is not duplicated', () => {
          const everyCategoryExists = programList.every(p => p.categories.every(category => category));

          expect(everyCategoryExists).toBeTruthy();

          const someCategoriesAreDuplicated = programList
            .some((program) => {
              const categoriesWithoutDuplicates = [...new Set(program.categories.map(c => c._id.toHexString()))];

              return program.categories.length !== categoriesWithoutDuplicates.length;
            });

          expect(someCategoriesAreDuplicated).toBeFalsy();
        });

        it('should pass if every tester exists and is not duplicated', () => {
          const everyTesterExists = programList.every(p => p.testers.every(tester => tester));

          expect(everyTesterExists).toBeTruthy();

          const someTestersAreDuplicated = programList
            .some((program) => {
              const testersWithoutDuplicates = [...new Set(program.testers.map(t => t._id.toHexString()))];

              return program.testers.length !== testersWithoutDuplicates.length;
            });

          expect(someTestersAreDuplicated).toBeFalsy();
        });

        it('should pass if testers are not rof or vendor admin', () => {
          const someTestersAreRofOrVendorAdmin = programList
            .some(p => p.testers
              .some(tester => [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(get(tester, 'role.vendor.name'))));

          expect(someTestersAreRofOrVendorAdmin).toBeFalsy();
        });
      });

      describe('Collection Questionnaire', () => {
        let questionnaireList;
        before(async () => {
          questionnaireList = await Questionnaire
            .find()
            .populate({ path: 'cards', select: '-__v -createdAt -updatedAt', transform })
            .lean({ virtuals: true });
        });

        it('should pass if every card exists and is not duplicated', () => {
          const everyCardExists = questionnaireList.every(questionnaire => questionnaire.cards.every(card => card));

          expect(everyCardExists).toBeTruthy();

          const someCardsAreDuplicated = questionnaireList
            .some((questionnaire) => {
              const cardsWithoutDuplicates = [...new Set(questionnaire.cards.map(card => card._id.toHexString()))];

              return questionnaire.cards.length !== cardsWithoutDuplicates.length;
            });

          expect(someCardsAreDuplicated).toBeFalsy();
        });

        it('should pass if some cards have questionnaire template', () => {
          const noneCardsHasQuestionnaireTemplate = questionnaireList
            .some(questionnaire => questionnaire.cards
              .every(card => ![OPEN_QUESTION, SURVEY, QUESTION_ANSWER].includes(card.template)));

          expect(noneCardsHasQuestionnaireTemplate).toBeFalsy();
        });

        it('should pass if published questionnaires have at least one card', () => {
          const everyPublishedQuestionnaireHasCards = questionnaireList
            .every(questionnaire => questionnaire.status === DRAFT || questionnaire.cards.length);

          expect(everyPublishedQuestionnaireHasCards).toBeTruthy();
        });

        it('should pass if published questionnaires have all their cards valid', () => {
          const everyPublishedQuestionnaireHasValidCards = questionnaireList
            .every(questionnaire => questionnaire.status === DRAFT || questionnaire.areCardsValid);

          expect(everyPublishedQuestionnaireHasValidCards).toBeTruthy();
        });
      });

      describe('Collection QuestionnaireHistory', () => {
        let questionnaireHistoryList;
        before(async () => {
          questionnaireHistoryList = await QuestionnaireHistory
            .find()
            .populate({ path: 'user', select: 'id', populate: { path: 'userCompanyList' } })
            .populate({ path: 'company', select: 'id' })
            .populate({ path: 'course', select: 'id' })
            .populate({ path: 'questionnaire', select: '_id cards status', populate: { path: 'cards' }, transform })
            .populate({ path: 'questionnaireAnswersList.card', select: 'template', transform })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if all questionnaire history\'s user are in questionnaire history\'s company', () => {
          const areUsersInCompany = questionnaireHistoryList
            .every(questionnaireHistory => questionnaireHistory.user.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, questionnaireHistory.company._id))
            );
          expect(areUsersInCompany).toBeTruthy();
        });

        it('should pass if every course exists', () => {
          const everyCourseExists = questionnaireHistoryList.every(qh => qh.course);

          expect(everyCourseExists).toBeTruthy();
        });

        it('should pass if every user exists', () => {
          const everyUserExists = questionnaireHistoryList.every(qh => qh.user);

          expect(everyUserExists).toBeTruthy();
        });

        it('should pass if user is registered to course', async () => {
          const trainees = questionnaireHistoryList.map(qh => qh.user._id);
          const courses = questionnaireHistoryList.map(qh => qh.course._id);
          const histories = await CourseHistory
            .find({ trainee: { $in: trainees }, course: { $in: courses }, action: TRAINEE_ADDITION })
            .lean();
          const everyUserIsRegisteredToCourse = questionnaireHistoryList
            .every(qh => histories
              .some(
                history => UtilsHelper.areObjectIdsEquals(history.trainee, qh.user._id) &&
                  UtilsHelper.areObjectIdsEquals(history.course, qh.course._id)
              )
            );
          expect(everyUserIsRegisteredToCourse).toBeTruthy();
        });

        it('should pass if every questionnaire exists and is published', () => {
          const everyQuestionnaireExists = questionnaireHistoryList
            .every(qh => qh.questionnaire && qh.questionnaire.status === PUBLISHED);

          expect(everyQuestionnaireExists).toBeTruthy();
        });

        it('should pass if every card exists and is in questionnaire', () => {
          const everyCardExists = questionnaireHistoryList
            .every(qh => qh.questionnaireAnswersList.every(qal => qal.card));

          expect(everyCardExists).toBeTruthy();

          const someCardsAreNotInQuestionnaires = questionnaireHistoryList
            .some((qh) => {
              const cardIds = qh.questionnaire.cards.map(c => c._id);

              return qh.questionnaireAnswersList.some(qal => !UtilsHelper.doesArrayIncludeId(cardIds, qal.card._id));
            });

          expect(someCardsAreNotInQuestionnaires).toBeFalsy();
        });

        it('should pass if every questionnaire answers list card is a questionnaire card', () => {
          const everyCardHasGoodTemplate = questionnaireHistoryList
            .every(qh => qh.questionnaireAnswersList
              .every(qal => [SURVEY, OPEN_QUESTION, QUESTION_ANSWER].includes(qal.card.template)));

          expect(everyCardHasGoodTemplate).toBeTruthy();
        });

        it('should pass if every mandatory card has answer', () => {
          const everyMandatoryCardHasAnswer = questionnaireHistoryList
            .every(qh => qh.questionnaire.cards
              .every(c => !c.isMandatory ||
              qh.questionnaireAnswersList.some(qal => UtilsHelper.areObjectIdsEquals(c._id, qal.card._id)))
            );

          expect(everyMandatoryCardHasAnswer).toBeTruthy();
        });

        it('should pass if there is the good answers number', () => {
          const everyHistoryHasGoodAnswersNumber = questionnaireHistoryList
            .every(qh => qh.questionnaireAnswersList.length &&
              qh.questionnaireAnswersList
                .every(qal => qal.answerList.length === 1 || qal.card.template === QUESTION_ANSWER));

          expect(everyHistoryHasGoodAnswersNumber).toBeTruthy();
        });

        it('should pass if every company exists', () => {
          const everyCompanyExists = questionnaireHistoryList.every(qh => qh.company);

          expect(everyCompanyExists).toBeTruthy();
        });

        it('should pass if company is linked to course', async () => {
          const companies = questionnaireHistoryList.map(qh => qh.company._id);
          const courses = questionnaireHistoryList.map(qh => qh.course._id);
          const histories = await CourseHistory
            .find({ company: { $in: companies }, course: { $in: courses }, action: COMPANY_ADDITION })
            .lean();
          const everyCompanyIsLinkedToCourse = questionnaireHistoryList
            .every(qh => histories
              .some(
                history => UtilsHelper.areObjectIdsEquals(history.company, qh.company._id) &&
                  UtilsHelper.areObjectIdsEquals(history.course, qh.course._id)
              )
            );
          expect(everyCompanyIsLinkedToCourse).toBeTruthy();
        });

        it('should pass if user is registered to course with company', async () => {
          const companies = questionnaireHistoryList.map(qh => qh.company._id);
          const trainees = questionnaireHistoryList.map(qh => qh.user._id);
          const courses = questionnaireHistoryList.map(qh => qh.course._id);
          const histories = await CourseHistory
            .find({
              company: { $in: companies },
              trainee: { $in: trainees },
              course: { $in: courses },
              action: TRAINEE_ADDITION,
            })
            .lean();
          const everyTraineeIsRegisteredToCourseWithCompany = questionnaireHistoryList
            .every(qh => histories
              .some(
                history => UtilsHelper.areObjectIdsEquals(history.company, qh.company._id) &&
                  UtilsHelper.areObjectIdsEquals(history.trainee, qh.user._id) &&
                  UtilsHelper.areObjectIdsEquals(history.course, qh.course._id)
              )
            );
          expect(everyTraineeIsRegisteredToCourseWithCompany).toBeTruthy();
        });
      });

      describe('Collection SectorHistory', () => {
        let sectorHistoryList;
        before(async () => {
          sectorHistoryList = await SectorHistory
            .find()
            .populate({ path: 'auxiliary', select: '_id', populate: { path: 'userCompanyList' } })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if all auxiliaries are in company at sector history startDate', () => {
          const areAuxiliariesInCompanyAtSectorHistoryStartDate = sectorHistoryList
            .every(sh => sh.auxiliary.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, sh.company) &&
                CompaniDate(sh.startDate).isAfter(uc.startDate)
              )
            );
          expect(areAuxiliariesInCompanyAtSectorHistoryStartDate).toBeTruthy();
        });
      });

      describe('Collection Step', () => {
        let stepList;
        before(async () => {
          stepList = await Step
            .find()
            .populate({ path: 'activities', select: '_id status', transform })
            .lean();
        });

        it('should pass if every activity exists and is not duplicated', () => {
          const everyActivityExists = stepList.every(step => step.activities.every(activity => activity));

          expect(everyActivityExists).toBeTruthy();

          const someActivitiesAreDuplicated = stepList
            .some((step) => {
              const activitiesWithoutDuplicates = [...new Set(step.activities.map(a => a._id.toHexString()))];

              return step.activities.length !== activitiesWithoutDuplicates.length;
            });

          expect(someActivitiesAreDuplicated).toBeFalsy();
        });

        it('should pass if no live step has actvities', () => {
          const someLiveStepHaveActivities = stepList.some(step => step.type !== E_LEARNING && step.activities.length);

          expect(someLiveStepHaveActivities).toBeFalsy();
        });

        it('should pass if published steps have theoretical duration', () => {
          const everyPublishedStepHasTheoreticalDuration = stepList
            .every(step => step.status === DRAFT || step.theoreticalDuration);

          expect(everyPublishedStepHasTheoreticalDuration).toBeTruthy();
        });

        it('should pass if published elearning steps have at least one activity', () => {
          const everyElearningPublishedStepHasActivities = stepList
            .filter(step => step.type === E_LEARNING && step.status === PUBLISHED)
            .every(step => step.activities.length);

          expect(everyElearningPublishedStepHasActivities).toBeTruthy();
        });

        it('should pass if every activity in published steps is published', () => {
          const everyPublishedStepHasPublishedActivities = stepList
            .filter(step => step.type === E_LEARNING && step.status === PUBLISHED)
            .every(step => step.activities.every(activity => activity.status === PUBLISHED));

          expect(everyPublishedStepHasPublishedActivities).toBeTruthy();
        });

        it('should pass if theoretical duration is a positive integer', () => {
          const theoreticalDurationIsPositiveInteger = stepList
            .every((step) => {
              if (!has(step, 'theoreticalDuration')) return true;

              const durationInMinutes = CompaniDuration(step.theoreticalDuration).asMinutes();
              return (Number.isInteger(durationInMinutes) && durationInMinutes > 0);
            });

          expect(theoreticalDurationIsPositiveInteger).toBeTruthy();
        });
      });

      describe('Collection SubProgram', () => {
        let subProgramList;
        before(async () => {
          subProgramList = await SubProgram
            .find()
            .populate({ path: 'steps', select: '_id', transform })
            .lean();
        });

        it('should pass if every step exists and is not duplicated', () => {
          const everyStepExists = subProgramList.every(sp => sp.steps.every(step => step));

          expect(everyStepExists).toBeTruthy();

          const someStepsAreDuplicated = subProgramList
            .some((subProgram) => {
              const stepsWithoutDuplicates = [...new Set(subProgram.steps.map(step => step._id.toHexString()))];

              return subProgram.steps.length !== stepsWithoutDuplicates.length;
            });

          expect(someStepsAreDuplicated).toBeFalsy();
        });

        it('should pass if every published subProgram has at least one step', () => {
          const doesEveryPublishedProgramHaveStep = subProgramList.every(sp => sp.status === DRAFT || sp.steps.length);

          expect(doesEveryPublishedProgramHaveStep).toBeTruthy();
        });
      });

      describe('Collection User', () => {
        let userList;
        before(async () => {
          userList = await User
            .find()
            .populate({ path: 'role.client', select: 'interface' })
            .populate({ path: 'role.vendor', select: 'interface' })
            .populate({ path: 'company' })
            .lean();
        });

        it('should pass if every user with client role has a company', () => {
          const doUsersWithClientRoleHaveCompany = userList.filter(u => get(u, 'role.client')).every(u => u.company);
          expect(doUsersWithClientRoleHaveCompany).toBeTruthy();
        });

        it('should pass if every user\'s role exists', () => {
          const isRoleNotFound = userList.filter(u => u.role).some(u =>
            (has(u, 'role.client') && !get(u, 'role.client._id')) ||
            (has(u, 'role.vendor') && !get(u, 'role.vendor._id'))
          );
          expect(isRoleNotFound).toBeFalsy();
        });

        it('should pass if every user\'s role is in good interface', () => {
          const doUsersHaveRoleInWrongInterface = userList.filter(u => u.role).some(u =>
            (u.role.client && u.role.client.interface !== CLIENT) ||
            (u.role.vendor && u.role.vendor.interface !== VENDOR)
          );
          expect(doUsersHaveRoleInWrongInterface).toBeFalsy();
        });
      });

      describe('Collection UserCompany', () => {
        let userCompanyList;
        before(async () => {
          userCompanyList = await UserCompany
            .find()
            .populate({ path: 'user', select: '_id' })
            .populate({ path: 'company', select: '_id' })
            .lean();
        });

        it('should pass if every company exists', () => {
          const companiesExist = userCompanyList.map(uc => uc.company).every(company => !!company);
          expect(companiesExist).toBeTruthy();
        });

        it('should pass if every user exists', () => {
          const usersExist = userCompanyList.map(uc => uc.user).every(user => !!user);
          expect(usersExist).toBeTruthy();
        });

        it('should pass if endDates are greater than startDates', () => {
          const areEndDatesAfterStartDates = userCompanyList
            .filter(uc => uc.endDate)
            .every(uc => CompaniDate(uc.endDate).isAfter(uc.startDate));
          expect(areEndDatesAfterStartDates).toBeTruthy();
        });

        it('should pass if no userCompany intersects with another and only last one has endDate', () => {
          const userCompaniesGroupedByUser = groupBy(userCompanyList, 'user._id');
          let hasIntersectionInUserCompanies = false;
          for (const specificUserCompanyList of Object.values(userCompaniesGroupedByUser)) {
            const userCompanyWithoutEndDate = specificUserCompanyList.filter(uc => !uc.endDate);
            expect(userCompanyWithoutEndDate.length).toBeLessThanOrEqual(1);

            const sortedUserCompanyList = [...specificUserCompanyList].sort(ascendingSort('startDate'));
            for (let i = 0; i < sortedUserCompanyList.length - 1; i++) {
              expect(sortedUserCompanyList[i].endDate).toBeTruthy();

              const hasIntersectionWithNextUserCompany = CompaniDate(sortedUserCompanyList[i].endDate)
                .isSameOrAfter(sortedUserCompanyList[i + 1].startDate);
              hasIntersectionInUserCompanies = hasIntersectionInUserCompanies && hasIntersectionWithNextUserCompany;
            }
          }
          expect(hasIntersectionInUserCompanies).toBeFalsy();
        });
      });

      describe('Collection UserHolding', () => {
        let userHoldingList;
        before(async () => {
          userHoldingList = await UserHolding
            .find()
            .populate({
              path: 'user',
              select: '_id role',
              populate: [
                { path: 'company' },
                { path: 'role.client', select: 'name' },
                { path: 'role.holding', select: 'name' },
              ],
            })
            .populate({ path: 'holding', select: '_id', populate: { path: 'companies' } })
            .lean();
        });

        it('should pass if every user exists', () => {
          const usersExist = userHoldingList.map(uh => uh.user).every(user => !!user);
          expect(usersExist).toBeTruthy();
        });

        it('should pass if every holding exists', () => {
          const holdingsExist = userHoldingList.map(uh => uh.holding).every(holding => !!holding);
          expect(holdingsExist).toBeTruthy();
        });

        it('should pass if every user is linked to a single holding', () => {
          const isUserLinkedToManyHoldings = userHoldingList
            .some(userHolding => userHoldingList
              .filter(uh => UtilsHelper.areObjectIdsEquals(userHolding.user._id, uh.user._id)).length > 1
            );
          expect(isUserLinkedToManyHoldings).toBeFalsy();
        });

        it('should pass if every user company is linked to holding', async () => {
          const isUserCompanyLinkedToHolding = userHoldingList
            .every(uh => UtilsHelper.doesArrayIncludeId(uh.holding.companies, uh.user.company));
          expect(isUserCompanyLinkedToHolding).toBeTruthy();
        });

        it('should pass if every user has holding and client role', () => {
          const everyUserHasGoodRoles = userHoldingList
            .every(u => [COACH, CLIENT_ADMIN].includes(get(u.user, 'role.client.name')) &&
              get(u.user, 'role.holding.name') === HOLDING_ADMIN);

          expect(everyUserHasGoodRoles).toBeTruthy();
        });
      });
    });
  });
});
