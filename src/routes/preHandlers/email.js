const Boom = require('@hapi/boom');
const get = require('lodash/get');
const User = require('../../models/User');
const translate = require('../../helpers/translate');
const { TRAINER, COACH, CLIENT_ADMIN } = require('../../helpers/constants');

const { language } = translate;

exports.authorizeSendEmail = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id');
  const isVendorUser = get(req, 'auth.credentials.role.vendor');

  const user = await User.findOne({ 'local.email': req.payload.email })
    .populate({ path: 'role.vendor', select: 'name' })
    .populate({ path: 'role.client', select: 'name' })
    .lean();

  if (!user) throw Boom.notFound(translate[language].userNotFound);

  const isSendingToTrainerOrCoach = isVendorUser &&
    (get(user, 'role.vendor.name') === TRAINER || [COACH, CLIENT_ADMIN].includes(get(user, 'role.client.name')));
  const sameCompany = user.company && user.company.toHexString() === companyId.toHexString();
  if (!isSendingToTrainerOrCoach && !sameCompany) throw Boom.forbidden();

  return null;
};
