const { expect } = require('expect');
const { groupBy, get, has, compact } = require('lodash');
const Activity = require('../../../src/models/Activity');
const Attendance = require('../../../src/models/Attendance');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const Card = require('../../../src/models/Card');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const Contract = require('../../../src/models/Contract');
const Course = require('../../../src/models/Course');
const CourseHistory = require('../../../src/models/CourseHistory');
const Helper = require('../../../src/models/Helper');
const Program = require('../../../src/models/Program');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const SectorHistory = require('../../../src/models/SectorHistory');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
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
} = require('../../../src/helpers/constants');
const attendancesSeed = require('./attendancesSeed');
const activitiesSeed = require('./activitiesSeed');
const activityHistoriesSeed = require('./activityHistoriesSeed');
const attendanceSheetsSeed = require('./attendanceSheetsSeed');
const cardsSeed = require('./cardsSeed');
const coursesSeed = require('./coursesSeed');
const courseHistoriesSeed = require('./courseHistoriesSeed');
const programsSeed = require('./programsSeed');
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
  { label: 'COURSE', value: coursesSeed },
  { label: 'COURSEHISTORY', value: courseHistoriesSeed },
  { label: 'PROGRAM', value: programsSeed },
  { label: 'QUESTIONNAIREHISTORY', value: questionnaireHistoriesSeed },
  { label: 'STEP', value: stepsSeed },
  { label: 'SUBPROGRAM', value: subProgramsSeed },
  { label: 'USERCOMPANY', value: userCompaniesSeed },
  { label: 'USER', value: usersSeed },
];

describe('SEEDS VERIFICATION', () => {
  seedList.forEach(({ label, value: seeds }) => {
    describe(`${label} SEEDS FILE`, () => {
      before(seeds.populateDB);

      describe('Collection Activity', () => {
        let activityList;
        before(async () => {
          activityList = await Activity
            .find()
            .populate({ path: 'cards', select: '-__v -createdAt -updatedAt', transform: doc => (doc || null) })
            .lean({ virtuals: true });
        });

        it('should pass if every card exists and is not duplicated', () => {
          const someCardsDontExist = activityList.some(activity => activity.cards.some(card => !card));

          expect(someCardsDontExist).toBeFalsy();

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
          const someTraineesDontExist = attendanceList.some(a => !a.trainee);

          expect(someTraineesDontExist).toBeFalsy();
        });

        it('should pass if all attendance\'s trainee are in attendance\'s company', () => {
          const areTraineesInCompany = attendanceList
            .every(attendance => attendance.trainee.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, attendance.company._id))
            );
          expect(areTraineesInCompany).toBeTruthy();
        });

        it('should pass if every slot exists', () => {
          const someSlotsDontExist = attendanceList.some(a => !a.courseSlot);

          expect(someSlotsDontExist).toBeFalsy();
        });

        it('should pass if every company exists', () => {
          const someCompaniesDontExist = attendanceList.some(a => !a.company);

          expect(someCompaniesDontExist).toBeFalsy();
        });

        it('should pass if every company is rattached to course', () => {
          const someCompaniesAreNotInCourse = attendanceList
            .some(a => !UtilsHelper.doesArrayIncludeId(a.courseSlot.course.companies, a.company._id));

          expect(someCompaniesAreNotInCourse).toBeFalsy();
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
          const someCoursesDontExist = attendanceSheetList.some(a => !a.course);

          expect(someCoursesDontExist).toBeFalsy();
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
          const someTraineesDontExist = attendanceSheetList.some(a => a.course.type === INTER_B2B && !a.trainee);

          expect(someTraineesDontExist).toBeFalsy();

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
          const someCompaniesDontExist = attendanceSheetList.some(a => !a.company);

          expect(someCompaniesDontExist).toBeFalsy();
        });

        it('should pass if every company is rattached to course', () => {
          const someCompaniesAreNotInCourse = attendanceSheetList
            .some(a => !UtilsHelper.doesArrayIncludeId(a.course.companies, a.company._id));

          expect(someCompaniesAreNotInCourse).toBeFalsy();
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

      describe('Collection CompanyLinkRequest', () => {
        let companyLinkRequestList;
        before(async () => {
          companyLinkRequestList = await CompanyLinkRequest
            .find()
            .populate({ path: 'user', select: '_id', populate: { path: 'userCompanyList' } })
            .lean();
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
              transform: doc => (doc || null),
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
            .populate({ path: 'companies', select: '_id', transform: doc => (doc || null) })
            .populate({
              path: 'accessRules',
              select: '_id',
              transform: doc => (doc || null),
            })
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
          const someCompaniesDontExist = coursesWithAccessRules.some(c => c.accessRules.some(company => !company));

          expect(someCompaniesDontExist).toBeFalsy();

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
          const someCompaniesDontExist = courseList
            .filter(c => c.format === BLENDED)
            .some(c => c.companies.some(company => !company));

          expect(someCompaniesDontExist).toBeFalsy();

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
          const someELearningCourseHasCompanies = courseList
            .filter(course => course.format === STRICTLY_E_LEARNING)
            .some(course => has(course, 'companies'));
          expect(someELearningCourseHasCompanies).toBeFalsy();
        });

        it('should pass if no e-learning course has misc field', () => {
          const someELearningCourseHasMisc = courseList
            .filter(course => course.format === STRICTLY_E_LEARNING)
            .some(course => has(course, 'misc'));
          expect(someELearningCourseHasMisc).toBeFalsy();
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
          const someTraineesDontExist = courseList.some(c => c.trainees.some(trainee => !trainee));

          expect(someTraineesDontExist).toBeFalsy();

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

              return UtilsHelper.doesArrayIncludeId(acceptedUsers, c.contact._id);
            });
          expect(isContactGoodUser).toBeTruthy();
        });

        it('should pass if no access rules for blended courses', () => {
          const haveBlendedCoursesAccessRules = courseList.some(c => c.format === BLENDED && c.accessRules.length);
          expect(haveBlendedCoursesAccessRules).toBeFalsy();
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
          const someUsersDontExist = courseList.some((c) => {
            const userList = [
              ...(has(c, 'companyRepresentative') ? [c.companyRepresentative] : []),
              ...(has(c, 'salesRepresentative') ? [c.salesRepresentative] : []),
              ...(has(c, 'trainer') ? [c.trainer] : []),
            ];

            return userList.some(u => u === null || u === 'user not found');
          });

          expect(someUsersDontExist).toBeFalsy();
        });
      });

      describe('Collection CourseHistory', () => {
        let courseHistoryList;
        before(async () => {
          courseHistoryList = await CourseHistory
            .find({})
            .populate({
              path: 'trainee',
              select: '_id',
              transform: doc => (doc || null),
              populate: { path: 'userCompanyList' },
            })
            .populate({ path: 'company', select: '_id', transform: doc => (doc || null) })
            .populate({
              path: 'createdBy',
              select: '_id role',
              transform: doc => (doc || null),
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
            .populate({ path: 'subPrograms', select: '_id', transform: doc => (doc || null) })
            .populate({ path: 'categories', select: '_id', transform: doc => (doc || null) })
            .populate({
              path: 'testers',
              select: '_id',
              transform: doc => (doc || null),
              populate: { path: 'role.vendor', select: 'name' },
            })
            .lean();
        });

        it('should pass if every subprogram exists and is not duplicated in same or different program', () => {
          const someSubProgramsDontExist = programList.some(p => p.subPrograms.some(subProgram => !subProgram));

          expect(someSubProgramsDontExist).toBeFalsy();

          const subProgramsList = programList
            .flatMap(program => program.subPrograms.map(sp => sp._id.toHexString()));
          const subProgramsWithoutDuplicates = [...new Set(subProgramsList)];

          expect(subProgramsWithoutDuplicates.length).toEqual(subProgramsList.length);
        });

        it('should pass if every category exists and is not duplicated', () => {
          const someCategoriesDontExist = programList.some(p => p.categories.some(category => !category));

          expect(someCategoriesDontExist).toBeFalsy();

          const someCategoriesAreDuplicated = programList
            .some((program) => {
              const categoriesWithoutDuplicates = [...new Set(program.categories.map(c => c._id.toHexString()))];

              return program.categories.length !== categoriesWithoutDuplicates.length;
            });

          expect(someCategoriesAreDuplicated).toBeFalsy();
        });

        it('should pass if every tester exists and is not duplicated', () => {
          const someTestersDontExist = programList.some(p => p.testers.some(tester => !tester));

          expect(someTestersDontExist).toBeFalsy();

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

      describe('Collection QuestionnaireHistory', () => {
        let questionnaireHistoryList;
        before(async () => {
          questionnaireHistoryList = await QuestionnaireHistory
            .find()
            .populate({ path: 'user', select: 'id', populate: { path: 'userCompanyList' } })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if all questionnaire history\'s user are in questionnaire history\'s company', () => {
          const areUsersInCompany = questionnaireHistoryList
            .every(questionnaireHistory => questionnaireHistory.user.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, questionnaireHistory.company))
            );
          expect(areUsersInCompany).toBeTruthy();
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
            .populate({ path: 'activities', select: '_id status', transform: doc => (doc || null) })
            .lean();
        });

        it('should pass if every activity exists and is not duplicated', () => {
          const someActivitiesDontExist = stepList.some(step => step.activities.some(activity => !activity));

          expect(someActivitiesDontExist).toBeFalsy();

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
            .populate({ path: 'steps', select: '_id', transform: doc => (doc || null) })
            .lean();
        });

        it('should pass if every step exists and is not duplicated', () => {
          const someStepsDontExist = subProgramList.some(sp => sp.steps.some(step => !step));

          expect(someStepsDontExist).toBeFalsy();

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
    });
  });
});
