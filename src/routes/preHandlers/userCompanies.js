const Boom = require('@hapi/Boom');
const get = require('lodash/get');
const { ObjectId } = require('mongodb');
const { TRAINER, TRAINEE_ADDITION } = require('../../helpers/constants');
const UserCompany = require('../../models/UserCompany');
const User = require('../../models/User');
const CourseHistory = require('../../models/CourseHistory');
const UtilsHelper = require('../../helpers/utils');
const translate = require('../../helpers/translate');

const EPS_ID = new ObjectId('615dceffbb5e7a0016388601');
const { language } = translate;

exports.authorizeUserCompanyEdit = async (req) => {
  const { auth: { credentials }, params, payload } = req;

  // we can only detach EPS trainee for now
  const userCompany = await UserCompany
    .find({ _id: params._id, endDate: { $exists: false }, company: EPS_ID })
    .populate({ path: 'company' })
    .lean();

  if (!userCompany) throw Boom.forbidden();

  const { company, user } = userCompany;
  const userClientRole = get(credentials, 'role.client.name');
  const userVendorRole = get(credentials, 'role.vendor.name');
  const isSameCompany = UtilsHelper.areObjectIdsEquals(company._id, credentials.company);
  if ((userClientRole && !isSameCompany && !userVendorRole) || userVendorRole === TRAINER) throw Boom.forbidden();

  const userExists = await User.countDocuments({ _id: user, role: { $exists: false } });
  if (!userExists) throw Boom.forbidden();

  const courseHistories = await CourseHistory
    .find({ action: TRAINEE_ADDITION, trainee: userCompany.user, createdAt: { $gte: payload.endDate } })
    .sort({ createdAt: -1 })
    .limit(1);

  if (courseHistories.length) {
    const errorMessage = translate[language].userDetachmentBeforeLastSubscription
      .replace('{DATE}', courseHistories[0].createdAt);
    throw Boom.forbidden(errorMessage);
  }

  if (CompaniDate(payload.endDate).isBefore(userCompany.startDate)) throw Boom.forbidden();

  return null;
};
