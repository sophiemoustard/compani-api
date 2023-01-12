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

  const userCompany = await UserCompany.findOne(
    { user, $or: [{ endDate: { $exists: false } }, { endDate: { $gt: userCompanyStartDate } }] },
    { endDate: 1 }
  ).lean();

  if (!userCompany) {
    await CompanyLinkRequest.deleteMany({ user });
    await UserCompany.create({ user, company, startDate: userCompanyStartDate });
  } else {
    const errorMessage = userCompany.endDate
      ? translate[language].userAlreadyLinkedToCompanyUntil
        .replace('{DATE}', CompaniDate(userCompany.endDate).format(DD_MM_YYYY))
      : translate[language].userAlreadyLinkedToCompany;
    throw Boom.conflict(errorMessage);
  }
};

exports.update = async (userCompany, payload) =>
  UserCompany.updateOne({ _id: userCompany }, { $set: { endDate: CompaniDate(payload.endDate).endOf(DAY).toISO() } });

exports.doUserCompaniesIncludeCompany = (userCompanyList, company) => userCompanyList
  .some(uc => (!uc.endDate || CompaniDate().isBefore(uc.endDate)) &&
    UtilsHelper.areObjectIdsEquals(uc.company, company));

exports.getCurrentOrFutureCompanies = userCompanyList => compact(userCompanyList
  .filter(uc => !uc.endDate || CompaniDate().isBefore(uc.endDate))
  .map(uc => uc.company));
