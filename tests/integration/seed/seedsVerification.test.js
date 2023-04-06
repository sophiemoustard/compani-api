const { expect } = require('expect');
const { groupBy, get, has, compact } = require('lodash');
const Attendance = require('../../../src/models/Attendance');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const Contract = require('../../../src/models/Contract');
const Course = require('../../../src/models/Course');
const Company = require('../../../src/models/Company');
const CourseHistory = require('../../../src/models/CourseHistory');
const Helper = require('../../../src/models/Helper');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const SectorHistory = require('../../../src/models/SectorHistory');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { ascendingSort } = require('../../../src/helpers/dates');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');
const { descendingSortBy, ascendingSortBy } = require('../../../src/helpers/dates/utils');
const UtilsHelper = require('../../../src/helpers/utils');
const UserCompaniesHelper = require('../../../src/helpers/userCompanies');
const {
  INTRA,
  COACH,
  ADMIN_CLIENT,
  TRAINEE_ADDITION,
  TRAINEE_DELETION,
  BLENDED,
  STRICTLY_E_LEARNING,
  INTER_B2B,
  INTER_B2C,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
} = require('../../../src/helpers/constants');
const attendancesSeed = require('./attendancesSeed');
const attendanceSheetsSeed = require('./attendanceSheetsSeed');
const coursesSeed = require('./coursesSeed');
const questionnaireHistoriesSeed = require('./questionnaireHistoriesSeed');
const userCompaniesSeed = require('./userCompaniesSeed');
const usersSeed = require('./usersSeed');

const seedList = [
  { label: 'ATTENDANCE', value: attendancesSeed },
  { label: 'ATTENDANCESHEET', value: attendanceSheetsSeed },
  { label: 'COURSE', value: coursesSeed },
  { label: 'QUESTIONNAIREHISTORY', value: questionnaireHistoriesSeed },
  { label: 'USERCOMPANY', value: userCompaniesSeed },
  { label: 'USER', value: usersSeed },
];

describe('SEEDS VERIFICATION', () => {
  seedList.forEach(({ label, value: seeds }) => {
    describe(`${label} SEEDS FILE`, () => {
      before(seeds.populateDB);

      describe('Collection Attendance', () => {
        let attendanceList;
        before(async () => {
          attendanceList = await Attendance
            .find()
            .populate({ path: 'trainee', select: 'id', populate: { path: 'userCompanyList' } })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if all attendance\'s trainee are in attendance\'s company', () => {
          const areTraineesInCompany = attendanceList
            .every(attendance => attendance.trainee.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, attendance.company))
            );
          expect(areTraineesInCompany).toBeTruthy();
        });
      });

      describe('Collection AttendanceSheet', () => {
        let attendanceSheetList;
        before(async () => {
          attendanceSheetList = await AttendanceSheet
            .find()
            .populate({ path: 'trainee', select: 'id', populate: { path: 'userCompanyList' } })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should pass if all attendance sheet\'s trainee are in attendance sheet\'s company', () => {
          const areTraineesInCompany = attendanceSheetList
            .filter(attendanceSheet => attendanceSheet.trainee)
            .every(attendanceSheet => attendanceSheet.trainee.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, attendanceSheet.company))
            );
          expect(areTraineesInCompany).toBeTruthy();
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
            .populate({ path: 'trainees', select: '_id', populate: { path: 'userCompanyList' } })
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
            .populate({ path: 'trainer', select: 'role.vendor' })
            .populate({ path: 'subProgram', select: '_id' })
            .populate({ path: 'slots', select: 'endDate' })
            .populate({ path: 'slotsToPlan' })
            .lean();
        });

        it('should pass if all trainees are in course companies', () => {
          const isEveryTraineeCompanyAttachedToCourse = courseList
            .filter(course => course.format === BLENDED)
            .every(course => course.trainees
              .every(trainee => trainee.userCompanyList
                .some(uc => UtilsHelper.doesArrayIncludeId(course.companies, uc.company))
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
            [COACH, ADMIN_CLIENT].includes(get(c.companyRepresentative, 'role.client.name')));
          expect(areCompanyRepresentativesCoachOrAdmin).toBeTruthy();
        });

        it('should pass if companyRepresentative is in good company', () => {
          const areCoursesAndCompanyRepresentativesInSameCompany = courseList
            .every(c => !c.companyRepresentative ||
              UtilsHelper.areObjectIdsEquals(c.companyRepresentative.company, c.companies[0]));
          expect(areCoursesAndCompanyRepresentativesInSameCompany).toBeTruthy();
        });

        it('should pass if all trainees registered in restricted access courses are in good company', () => {
          const isEveryTraineeCompanyInAccessRules = courseList
            .filter(course => course.format === STRICTLY_E_LEARNING && get(course, 'accessRules.length'))
            .every(course => course.trainees
              .every(trainee => trainee.userCompanyList
                .some(uc => UtilsHelper.doesArrayIncludeId(course.accessRules, uc.company))
              ));
          expect(isEveryTraineeCompanyInAccessRules).toBeTruthy();
        });

        it('should pass if every subprogram exists', () => {
          const coursesExist = courseList.map(course => course.subProgram).every(subProgram => !!subProgram);
          expect(coursesExist).toBeTruthy();
        });

        it('should pass if every blended course has companies field', () => {
          const everyBlendedCourseHasCompanies = courseList
            .filter(course => course.format === BLENDED)
            .every(course => has(course, 'companies'));
          expect(everyBlendedCourseHasCompanies).toBeTruthy();
        });

        it('should pass if every company exists', async () => {
          const companiesIds = compact(courseList.flatMap(course => course.companies)).map(c => c.toHexString());
          const uniqCompaniesIds = [...new Set(companiesIds)];

          const companiesCount = await Company.countDocuments({ _id: { $in: uniqCompaniesIds } });

          expect(companiesCount).toEqual(uniqCompaniesIds.length);
        });

        it('should pass if none course has company in duplicate', () => {
          const someCompaniesAreInDuplicate = courseList
            .filter(course => get(course, 'companies.length'))
            .some((course) => {
              const companiesWithoutDuplicates = [...new Set(course.companies.map(c => c.toHexString()))];

              return course.companies.length !== companiesWithoutDuplicates.length;
            });

          expect(someCompaniesAreInDuplicate).toBeFalsy();
        });

        it('should pass if every intra course has company', () => {
          const everyIntraCourseHasCompany = courseList
            .filter(course => course.type === INTRA)
            .every(course => course.companies.length === 1);

          expect(everyIntraCourseHasCompany).toBeTruthy();
        });

        it('should pass if none e-learning course has companies field', () => {
          const someELearningCourseHasCompanies = courseList
            .filter(course => course.format === STRICTLY_E_LEARNING)
            .some(course => has(course, 'companies'));
          expect(someELearningCourseHasCompanies).toBeFalsy();
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
          const IsTrainerIncludedInTrainees = courseList
            .filter(c => has(c, 'trainer'))
            .some(c => UtilsHelper.doesArrayIncludeId(c.trainees.map(t => t._id), c.trainer._id));
          expect(IsTrainerIncludedInTrainees).toBeFalsy();
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

        it('should pass if only blended courses have sales representative', () => {
          const DoELearningCoursesHaveSalesRepresentative = courseList
            .some(c => c.format === STRICTLY_E_LEARNING && c.salesRepresentative);
          expect(DoELearningCoursesHaveSalesRepresentative).toBeFalsy();
        });

        it('should pass if all sales representative are rof or vendor admin', () => {
          const haveAllSalesRepresentativesGoodRole = courseList
            .filter(c => c.salesRepresentative)
            .every(c => [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN]
              .includes(get(c.salesRepresentative, 'role.vendor.name')));
          expect(haveAllSalesRepresentativesGoodRole).toBeTruthy();
        });

        it('should pass if estimated start date is defined for blended courses only', () => {
          const DoELearningCoursesHaveEstimatedStartDate = courseList
            .some(c => c.format === STRICTLY_E_LEARNING && c.estimatedStartDate);
          expect(DoELearningCoursesHaveEstimatedStartDate).toBeFalsy();
        });

        it('should pass if archive date is defined for blended courses only', () => {
          const DoELearningCoursesHaveArchiveDate = courseList
            .some(c => c.format === STRICTLY_E_LEARNING && c.archivedAt);
          expect(DoELearningCoursesHaveArchiveDate).toBeFalsy();
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

        it('should pass if course with archive date always have trainees and slots', () => {
          const DoArchivedCoursesHaveSlotsAndTrainees = courseList
            .every(c => !c.archivedAt || (c.slots.length && c.trainees.length));
          expect(DoArchivedCoursesHaveSlotsAndTrainees).toBeTruthy();
        });

        it('should pass if course with archive date never have slots to plan', () => {
          const DoArchivedCoursesHaveSlotsToPlan = courseList
            .some(c => c.archivedAt && c.slotsToPlan.length);
          expect(DoArchivedCoursesHaveSlotsToPlan).toBeFalsy();
        });

        it('should pass if max trainees is defined only for intra courses', () => {
          const isMaxTraineesDefinedForIntraCourseOnly = courseList
            .every(c => c.type === INTRA || !has(c, 'maxTrainees'));
          expect(isMaxTraineesDefinedForIntraCourseOnly).toBeTruthy();
        });

        it('should pass if number of trainees is lower than max trainees', () => {
          const isNumberOfTraineesLowerThanMaxTrainees = courseList
            .filter(c => has(c, 'maxTrainees'))
            .every(c => c.trainees.length <= c.maxTrainees);
          expect(isNumberOfTraineesLowerThanMaxTrainees).toBeTruthy();
        });
      });

      describe('Collection CourseHistory', () => {
        let courseHistoryList;
        before(async () => {
          courseHistoryList = await CourseHistory
            .find(
              { action: { $in: [TRAINEE_ADDITION, TRAINEE_DELETION] } },
              { action: 1, createdAt: 1, trainee: 1, course: 1, company: 1 }
            )
            .populate({ path: 'trainee', select: '_id', populate: { path: 'userCompanyList' } })
            .lean();
        });

        it('should pass if all trainees are in course company at registration', () => {
          const courseHistoriesGroupedByCourse = groupBy(courseHistoryList, 'course');

          for (const courseHistories of Object.values(courseHistoriesGroupedByCourse)) {
            const courseHistoriesGroupedByTrainee = groupBy(courseHistories, 'trainee._id');

            for (const traineeCourseHistories of Object.values(courseHistoriesGroupedByTrainee)) {
              const lastHistory = traineeCourseHistories.sort(descendingSortBy('createdAt'))[0];
              const isTraineeInCompanyBeforeAction = traineeCourseHistories.sort(ascendingSortBy('createdAt'))
                .every((ch, i) => {
                  if (i % 2 === 0) {
                    return ch.action === TRAINEE_ADDITION && ch.trainee.userCompanyList
                      .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, ch.company));
                  }

                  return ch.action === TRAINEE_DELETION;
                });
              expect(isTraineeInCompanyBeforeAction).toBeTruthy();

              const isLastHistoryAddition = lastHistory.action === TRAINEE_ADDITION;

              let isTraineeStillInCompanyAtRegistration = true;
              if (isLastHistoryAddition) {
                isTraineeStillInCompanyAtRegistration = lastHistory.trainee.userCompanyList.some(uc =>
                  UtilsHelper.areObjectIdsEquals(uc.company, lastHistory.company) &&
                    (!uc.endDate || CompaniDate(lastHistory.createdAt).isBefore(uc.endDate))
                );
              }

              expect(!isLastHistoryAddition || isTraineeStillInCompanyAtRegistration).toBeTruthy();
            }
          }
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

      describe('Collection User', () => {
        let userList;
        before(async () => {
          userList = await User.find().populate({ path: 'company' }).lean();
        });

        it('should pass if every user with client role has a company', () => {
          const doUsersWithClientRoleHaveCompany = userList.filter(u => get(u, 'role.client')).every(u => u.company);
          expect(doUsersWithClientRoleHaveCompany).toBeTruthy();
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
