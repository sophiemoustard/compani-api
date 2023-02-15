const Boom = require('@hapi/boom');
const compact = require('lodash/compact');
const translate = require('./translate');
const { DD_MM_YYYY, DAY } = require('./constants');
const { CompaniDate } = require('./dates/companiDates');
const UtilsHelper = require('./utils');
const CompanyLinkRequest = require('../models/CompanyLinkRequest');
const UserCompany = require('../models/UserCompany');

const { language } = translate;

exports.create = async ({ user, company, startDate = CompaniDate() }) => {
  const userCompanyStartDate = CompaniDate(startDate).startOf(DAY).toISO();

  const userCompany = await UserCompany
    .find(
      { user, $or: [{ endDate: { $exists: false } }, { endDate: { $gt: userCompanyStartDate } }] },
      { endDate: 1 }
    )
    .sort({ startDate: -1 })
    .limit(1)
    .lean();

  if (!userCompany[0]) {
    await CompanyLinkRequest.deleteMany({ user });
    await UserCompany.create({ user, company, startDate: userCompanyStartDate });
  } else {
    const errorMessage = userCompany[0].endDate
      ? translate[language].userAlreadyLinkedToCompanyUntil
        .replace('{DATE}', CompaniDate(userCompany[0].endDate).format(DD_MM_YYYY))
      : translate[language].userAlreadyLinkedToCompany;
    throw Boom.conflict(errorMessage);
  }
};

exports.update = async (userCompany, payload) =>
  UserCompany.updateOne({ _id: userCompany }, { $set: { endDate: CompaniDate(payload.endDate).endOf(DAY).toISO() } });

exports.userIsOrWillBeInCompany = (userCompanyList, company) => userCompanyList
  .some(uc => (!uc.endDate || CompaniDate().isBefore(uc.endDate)) &&
    UtilsHelper.areObjectIdsEquals(uc.company, company));

exports.getCurrentAndFutureCompanies = userCompanyList => compact(userCompanyList
  .filter(uc => !uc.endDate || CompaniDate().isBefore(uc.endDate))
  .map(uc => uc.company));
