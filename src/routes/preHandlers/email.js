const Boom = require('@hapi/boom');
const get = require('lodash/get');
const User = require('../../models/User');
const translate = require('../../helpers/translate');
const { TRAINER } = require('../../helpers/constants');

const { language } = translate;

exports.authorizeSendEmail = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id');
  const isVendorUser = get(req, 'auth.credentials.role.vendor');

  const user = await User.findOne({ 'local.email': req.payload.email })
    .populate({ path: 'role.vendor', select: 'name' })
    .lean();

  if (!user) throw Boom.notFound(translate[language].userNotFound);
  const isSendingToTrainer = isVendorUser && get(user, 'role.vendor.name') === TRAINER;
  const sameCompany = user.company.toHexString() === companyId.toHexString();
  if (!isSendingToTrainer && !sameCompany) throw Boom.forbidden();

  return null;
};
