const { expect } = require('expect');
const { groupBy, get } = require('lodash');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const Course = require('../../../src/models/Course');
const CourseHistory = require('../../../src/models/CourseHistory');
const Helper = require('../../../src/models/Helper');
const User = require('../../../src/models/User');
const UserCompany = require('../../../src/models/UserCompany');
const { ascendingSort } = require('../../../src/helpers/dates');
const UtilsHelper = require('../../../src/helpers/utils');
const { INTRA, COACH, ADMIN_CLIENT, TRAINEE_ADDITION, TRAINEE_DELETION } = require('../../../src/helpers/constants');
const userCompaniesSeed = require('./userCompaniesSeed');
const usersSeed = require('./usersSeed');
const { descendingSortBy } = require('../../../src/helpers/dates/utils');

const seedList = [
  { label: 'USERCOMPANY', value: userCompaniesSeed },
  { label: 'USER', value: usersSeed },
];

describe('SEEDS VERIFICATION', () => {
  seedList.forEach(({ label, value: seeds }) => {
    describe(`${label} SEEDS FILE`, () => {
      before(async () => {
        await seeds.populateDB();
      });

      describe('Collection CompanyLinkRequest', () => {
        let companyLinkRequestList;
        before(async () => {
          companyLinkRequestList = await CompanyLinkRequest
            .find()
            .populate({ path: 'user', select: '_id', populate: { path: 'company' } })
            .lean();
        });

        it('should return false if user already has a company', () => {
          const doUsersAlreadyHaveCompany = companyLinkRequestList.some(request => get(request.user, 'company'));
          expect(doUsersAlreadyHaveCompany).toBeFalsy();
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
              populate: [
                { path: 'company', select: 'user company startDate' },
                { path: 'role.client', select: 'name' },
              ],
            })
            .lean();
        });

        it('should return true if all trainees are in course companies', () => {
          const isEveryTraineeCompanyAttachedToCourse = courseList
            .every(course => !course.companies || course.trainees
              .every(trainee => trainee.userCompanyList
                .some(uc => UtilsHelper.doesArrayIncludeId(course.companies, uc.company))
              ));
          expect(isEveryTraineeCompanyAttachedToCourse).toBeTruthy();
        });

        it('should return true if companyRepresentative is defined in intra course only', () => {
          const isCompanyRepresentativeOnlyInIntraCourses = courseList
            .every(c => !c.companyRepresentative || (c.companyRepresentative && c.type === INTRA));
          expect(isCompanyRepresentativeOnlyInIntraCourses).toBeTruthy();
        });

        it('should return true if companyRepresentative has good role', () => {
          const areCompanyRepresentativesCoachOrAdmin = courseList.every(c => !c.companyRepresentative ||
          [COACH, ADMIN_CLIENT].includes(get(c.companyRepresentative, 'role.client.name')));
          expect(areCompanyRepresentativesCoachOrAdmin).toBeTruthy();
        });

        it('should return true if companyRepresentative is well defined', () => {
          const areCoursesAndCompanyRepresentativesInSameCompany = courseList
            .every(c => !c.companyRepresentative ||
            UtilsHelper.areObjectIdsEquals(c.companyRepresentative.company, c.companies[0]));
          expect(areCoursesAndCompanyRepresentativesInSameCompany).toBeTruthy();
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

        it('should return true if all trainees are in course company at registration', () => {
          const courseHistoriesGroupedByCourse = groupBy(courseHistoryList, 'course');

          for (const courseHistories of Object.values(courseHistoriesGroupedByCourse)) {
            const courseHistoriesGroupedByTrainee = groupBy(courseHistories, 'trainee._id');

            for (const traineeCourseHistories of Object.values(courseHistoriesGroupedByTrainee)) {
              const lastHistory = traineeCourseHistories.sort(descendingSortBy('createdAt'))[0];

              const isTraineeInCompanyBeforeAction = traineeCourseHistories.every(ch =>
                ch.trainee.userCompanyList.some(uc => UtilsHelper.areObjectIdsEquals(uc.company, lastHistory.company) &&
                CompaniDate(ch.createdAt).isAfter(uc.startDate)
                )
              );
              expect(isTraineeInCompanyBeforeAction).toBeTruthy();

              const isLastHistoryAddition = lastHistory.action === TRAINEE_ADDITION;
              const isTraineeStillInCompanyAtRegistration = lastHistory.trainee.userCompanyList.some(uc =>
                UtilsHelper.areObjectIdsEquals(uc.company, lastHistory.company) &&
              (!uc.endDate || CompaniDate(lastHistory.createdAt).isBefore(uc.endDate))
              );

              expect(!isLastHistoryAddition || isTraineeStillInCompanyAtRegistration).toBeTruthy();
            }
          }
        });
      });

      describe('Collection Helper', () => {
        let helperList;
        before(async () => {
          await seeds.populateDB();
          helperList = await Helper
            .find()
            .populate({
              path: 'user',
              select: '_id',
              populate: { path: 'userCompanyList' },
            })
            .populate({ path: 'company', select: '_id' })
            .setOptions({ allCompanies: true })
            .lean();
        });

        it('should return true if every company exists', () => {
          const companiesExist = helperList.map(helper => helper.company).every(company => !!company);
          expect(companiesExist).toBeTruthy();
        });

        it('should return true if every user exists', () => {
          const usersExist = helperList.map(helper => helper.user).every(user => !!user);
          expect(usersExist).toBeTruthy();
        });
        it('should return true if every helper has a matching user and company', () => {
          const areUserAndCompanyMatching = helperList
            .every(helper => helper.user.userCompanyList
              .some(uc => UtilsHelper.areObjectIdsEquals(uc.company, helper.company._id) &&
              UtilsHelper.areObjectIdsEquals(uc.user, helper.user._id)
              )
            );
          expect(areUserAndCompanyMatching).toBeTruthy();
        });
      });

      describe('Collection User', () => {
        let userList;
        before(async () => {
          await seeds.populateDB();
          userList = await User.find().populate({ path: 'company' }).lean();
        });

        it('should return true if every user with client role has a company', () => {
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

        it('should return true if every company exists', () => {
          const companiesExist = userCompanyList.map(uc => uc.company).every(company => !!company);
          expect(companiesExist).toBeTruthy();
        });

        it('should return true if every user exists', () => {
          const usersExist = userCompanyList.map(uc => uc.user).every(user => !!user);
          expect(usersExist).toBeTruthy();
        });

        it('should return true if endDates are greater than startDates', () => {
          const areEndDatesAfterStartDates = userCompanyList
            .filter(uc => uc.endDate)
            .every(uc => CompaniDate(uc.endDate).isAfter(uc.startDate));
          expect(areEndDatesAfterStartDates).toBeTruthy();
        });

        it('should return true if no userCompany intersects with another and only last one has endDate', () => {
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
