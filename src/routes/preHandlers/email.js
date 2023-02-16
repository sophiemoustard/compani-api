const Boom = require('@hapi/boom');
const get = require('lodash/get');
const User = require('../../models/User');
const translate = require('../../helpers/translate');
const { TRAINER, COACH, CLIENT_ADMIN, TRAINEE } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');
const UserCompaniesHelper = require('../../helpers/userCompanies');

const { language } = translate;

exports.authorizeSendEmail = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id') || '';
  const isVendorUser = get(req, 'auth.credentials.role.vendor') || false;

  const receiver = await User.findOne({ 'local.email': req.payload.email })
    .populate({ path: 'userCompanyList' })
    .populate({ path: 'role.vendor', select: 'name' })
    .populate({ path: 'role.client', select: 'name' })
    .lean();

  if (!receiver) throw Boom.notFound(translate[language].userNotFound);

  const receiverIsTrainer = get(receiver, 'role.vendor.name') === TRAINER;
  const receiverIsCoachOrAdmin = [COACH, CLIENT_ADMIN].includes(get(receiver, 'role.client.name'));
  const vendorIsSendingToAuthorizedType = isVendorUser &&
    (receiverIsTrainer || req.payload.type === TRAINEE || receiverIsCoachOrAdmin);
  const getCurrentAndFutureCompanies = UserCompaniesHelper.getCurrentAndFutureCompanies(receiver.userCompanyList);
  const sameCompany = UtilsHelper.doesArrayIncludeId(getCurrentAndFutureCompanies, companyId);
  if (!vendorIsSendingToAuthorizedType && !sameCompany) throw Boom.notFound();

  return null;
};
