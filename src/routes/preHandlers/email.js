const Boom = require('@hapi/boom');
const get = require('lodash/get');
const User = require('../../models/User');
const translate = require('../../helpers/translate');
const {
  TRAINER,
  COACH,
  CLIENT_ADMIN,
  TRAINEE,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
} = require('../../helpers/constants');
const { areObjectIdsEquals } = require('../../helpers/utils');

const { language } = translate;

exports.authorizeSendEmail = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id') || '';
  const roleVendorUser = get(req, 'auth.credentials.role.vendor.name') || false;

  const receiver = await User.findOne({ 'local.email': req.payload.email })
    .populate({ path: 'company' })
    .populate({ path: 'role.vendor', select: 'name' })
    .populate({ path: 'role.client', select: 'name' })
    .lean();

  if (!receiver) throw Boom.notFound(translate[language].userNotFound);

  const receiverIsRegisteringAsTrainee = req.payload.type === TRAINEE;
  const receiverIsTrainer = get(receiver, 'role.vendor.name') === TRAINER;
  const receiverIsCoachOrAdmin = [COACH, CLIENT_ADMIN].includes(get(receiver, 'role.client.name'));

  const userIsSendingToAuthorizedType =
    (roleVendorUser && receiverIsRegisteringAsTrainee) ||
    ([TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(roleVendorUser) && receiverIsTrainer) ||
    (roleVendorUser === VENDOR_ADMIN && receiverIsCoachOrAdmin);

  const sameCompany = areObjectIdsEquals(receiver.company, companyId);
  if (!userIsSendingToAuthorizedType && !sameCompany) throw Boom.notFound();

  return null;
};
