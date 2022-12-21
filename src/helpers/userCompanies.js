const Boom = require('@hapi/boom');
const UtilsHelper = require('./utils');
const translate = require('./translate');
const { DD_MM_YYYY, DAY } = require('./constants');
const { CompaniDate } = require('./dates/companiDates');
const CompanyLinkRequest = require('../models/CompanyLinkRequest');
const UserCompany = require('../models/UserCompany');

const { language } = translate;

exports.create = async (payload) => {
  const { user, company, startDate = CompaniDate().startOf(DAY).toISO() } = payload;

  const userCompany = await UserCompany.findOne(
    { user, $or: [{ endDate: { $exists: false } }, { endDate: { $gt: startDate } }] },
    { company: 1 }
  ).lean();

  if (!userCompany) {
    await CompanyLinkRequest.deleteMany({ user });
    await UserCompany.create({ user, company, startDate });
  } else if (!UtilsHelper.areObjectIdsEquals(userCompany.company, company)) {
    const errorMessage = userCompany.endDate
      ? translate[language].userAlreadyLinkedToCompanyUntil
        .replace('{DATE}', CompaniDate(userCompany.endDate).format(DD_MM_YYYY))
      : translate[language].userAlreadyLinkedToCompany;
    throw Boom.conflict(errorMessage);
  }
};

exports.update = async (userCompany, payload) =>
  UserCompany.updateOne({ _id: userCompany }, { $set: { endDate: CompaniDate(payload.endDate).endOf(DAY).toISO() } });
