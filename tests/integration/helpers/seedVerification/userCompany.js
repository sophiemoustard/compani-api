const { expect } = require('expect');
const { groupBy } = require('lodash');
const UserCompany = require('../../../../src/models/UserCompany');
const { CompaniDate } = require('../../../../src/helpers/dates/companiDates');
const { ascendingSort } = require('../../../../src/helpers/dates');

exports.checkUserCompanySeeds = async () => {
  try {
    const userCompanyList = await UserCompany
      .find()
      .populate({ path: 'user', select: '_id' })
      .populate({ path: 'company', select: '_id' })
      .lean();

    const everyCompanyExists = userCompanyList.map(uc => uc.company).every(company => !!company);
    expect(everyCompanyExists).toBeTruthy();

    const everyUserExists = userCompanyList.map(uc => uc.user).every(user => !!user);
    expect(everyUserExists).toBeTruthy();

    const areEndDatesAfterStartDates = userCompanyList
      .filter(uc => uc.endDate)
      .every(uc => CompaniDate(uc.endDate).isAfter(uc.startDate));
    expect(areEndDatesAfterStartDates).toBeTruthy();

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

    return true;
  } catch (e) {
    console.error('Error in seeds', e);
    return false;
  }
};
