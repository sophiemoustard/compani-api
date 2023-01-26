const { expect } = require('expect');
const { groupBy, get } = require('lodash');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');
const UserCompany = require('../../../src/models/UserCompany');
const Course = require('../../../src/models/Course');
const CourseHistory = require('../../../src/models/CourseHistory');
const { ascendingSort } = require('../../../src/helpers/dates');
const UtilsHelper = require('../../../src/helpers/utils');
const { INTRA, COACH, ADMIN_CLIENT, TRAINEE_ADDITION, TRAINEE_DELETION } = require('../../../src/helpers/constants');
const userCompaniesSeed = require('./userCompaniesSeed');
const userSeed = require('./usersSeed');
const { descendingSortBy } = require('../../../src/helpers/dates/utils');

const seedsToTestList = [
  { label: 'userCompany', value: userCompaniesSeed },
  { label: 'user', value: userSeed },
];

describe('SEEDS VERIFICATION', () => {
  seedsToTestList.forEach(({ label, value: seedsToTest }) => {
    before(async () => {
      await seedsToTest.populateDB();
    });

    describe(`COURSE SEEDS for ${label}`, () => {
      let courseList;
      before(async () => {
        await seedsToTest.populateDB();
        courseList = await Course
          .find()
          .populate({ path: 'trainees', select: '_id', populate: { path: 'userCompanyList' } })
          .populate({
            path: 'companyRepresentative',
            select: '_id',
            populate: [{ path: 'company', select: 'user company startDate' }, { path: 'role.client', select: 'name' }],
          })
          .lean();
      });

      it('should return true if all trainees are in course companies', () => {
        const everyTraineeCompanyIsAttachedToCourse = courseList
          .every(course => !course.companies || course.trainees
            .every(trainee => trainee.userCompanyList
              .some(uc => UtilsHelper.doesArrayIncludeId(course.companies, uc.company))
            ));
        expect(everyTraineeCompanyIsAttachedToCourse).toBeTruthy();
      });

      it('should return true if companyRepresentative is well defined', () => {
        const onlyIntraHasCompanyRepresentative = courseList
          .every(c => !c.companyRepresentative || (c.companyRepresentative && c.type === INTRA));
        expect(onlyIntraHasCompanyRepresentative).toBeTruthy();

        const everyCompanyRepresentativeIsCoachOrAdmin = courseList.every(c => !c.companyRepresentative ||
          [COACH, ADMIN_CLIENT].includes(get(c.companyRepresentative, 'role.client.name')));
        expect(everyCompanyRepresentativeIsCoachOrAdmin).toBeTruthy();

        const everyCompanyRepresentativeIsInCompany = courseList
          .every(c => !c.companyRepresentative ||
            UtilsHelper.areObjectIdsEquals(c.companyRepresentative.company, c.companies[0]));
        expect(everyCompanyRepresentativeIsInCompany).toBeTruthy();
      });
    });

    describe(`COURSEHISTORIES SEEDS FOR ${label}`, () => {
      let coursesHistoryList;
      before(async () => {
        await seedsToTest.populateDB();
        coursesHistoryList = await CourseHistory
          .find(
            { action: { $in: [TRAINEE_ADDITION, TRAINEE_DELETION] } },
            { action: 1, createdAt: 1, trainee: 1, course: 1, company: 1 }
          )
          .populate({ path: 'trainee', select: '_id', populate: { path: 'userCompanyList' } })
          .lean();
      });

      it('should return true if all trainees are in course company at subscription', () => {
        const courseHistoriesGroupedByCourse = groupBy(coursesHistoryList, 'course');

        for (const courseHistories of Object.values(courseHistoriesGroupedByCourse)) {
          const courseHistoriesGroupedByTrainee = groupBy(courseHistories, 'trainee._id');

          for (const traineeCourseHistory of Object.values(courseHistoriesGroupedByTrainee)) {
            const lastHistory = traineeCourseHistory.sort(descendingSortBy('createdAt'))[0];

            const traineeIsInCompanyBeforeAction = traineeCourseHistory.every(ch =>
              ch.trainee.userCompanyList.some(uc => UtilsHelper.areObjectIdsEquals(uc.company, lastHistory.company) &&
                CompaniDate(ch.createdAt).isAfter(uc.startDate)
              )
            );
            expect(traineeIsInCompanyBeforeAction).toBeTruthy();

            const lastHistoryIsAddition = lastHistory.action === TRAINEE_ADDITION;
            const traineeIsStillInCompanyAtSubscription = lastHistory.trainee.userCompanyList.some(uc =>
              UtilsHelper.areObjectIdsEquals(uc.company, lastHistory.company) &&
              (!uc.endDate || CompaniDate(lastHistory.createdAt).isBefore(uc.endDate))
            );

            expect(!lastHistoryIsAddition || traineeIsStillInCompanyAtSubscription).toBeTruthy();
          }
        }
      });
    });

    describe(`USERCOMPANY SEEDS for ${label}`, () => {
      let userCompanyList;
      before(async () => {
        await seedsToTest.populateDB();
        userCompanyList = await UserCompany
          .find()
          .populate({ path: 'user', select: '_id' })
          .populate({ path: 'company', select: '_id' })
          .lean();
      });

      it('should return true if company exists', () => {
        const everyCompanyExists = userCompanyList.map(uc => uc.company).every(company => !!company);
        expect(everyCompanyExists).toBeTruthy();
      });

      it('should return true if user exists', () => {
        const everyUserExists = userCompanyList.map(uc => uc.user).every(user => !!user);
        expect(everyUserExists).toBeTruthy();
      });

      it('should return true if endDate is greater than startDate', () => {
        const areEndDatesAfterStartDates = userCompanyList
          .filter(uc => uc.endDate)
          .every(uc => CompaniDate(uc.endDate).isAfter(uc.startDate));
        expect(areEndDatesAfterStartDates).toBeTruthy();
      });

      it('should return true if userCompanies not intersect and only last one has endDate', () => {
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
