const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { TRAINER, TRAINEE_ADDITION, DD_MM_YYYY } = require('../../helpers/constants');
const UserCompany = require('../../models/UserCompany');
const User = require('../../models/User');
const CourseHistory = require('../../models/CourseHistory');
const UtilsHelper = require('../../helpers/utils');
const translate = require('../../helpers/translate');
const { CompaniDate } = require('../../helpers/dates/companiDates');

const { language } = translate;

exports.authorizeUserCompanyEdit = async (req) => {
  const { auth: { credentials }, params, payload } = req;

  // we can only detach EPS trainee for now
  const userCompany = await UserCompany
    .findOne({
      _id: params._id,
      startDate: { $lte: CompaniDate().toISO() },
      endDate: { $exists: false },
      company: { $in: process.env.DETACHMENT_ALLOWED_COMPANY_IDS },
    })
    .populate({ path: 'company' })
    .lean();
  if (!userCompany) throw Boom.forbidden();

  const { company, user, startDate } = userCompany;

  const userVendorRole = get(credentials, 'role.vendor.name');
  const userClientRole = get(credentials, 'role.client.name');

  if (userVendorRole === TRAINER && !userClientRole) throw Boom.forbidden();

  const isSameCompany = UtilsHelper.areObjectIdsEquals(company._id, credentials.company._id);
  if ((userClientRole && !isSameCompany && !userVendorRole)) throw Boom.forbidden();

  const userExists = await User.countDocuments({ _id: user, role: { $exists: false } });
  if (!userExists) throw Boom.forbidden();

  if (CompaniDate(payload.endDate).isBefore(startDate)) {
    throw Boom.forbidden(translate[language].endDateBeforeStartDate);
  }

  const courseHistories = await CourseHistory
    .find({ action: TRAINEE_ADDITION, trainee: user, createdAt: { $gte: payload.endDate } })
    .sort({ createdAt: -1 })
    .limit(1);

  if (courseHistories.length) {
    const errorMessage = translate[language].userDetachmentBeforeLastSubscription
      .replace('{DATE}', CompaniDate(courseHistories[0].createdAt).format(DD_MM_YYYY));
    throw Boom.forbidden(errorMessage);
  }

  return null;
};
