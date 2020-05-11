const Boom = require('@hapi/boom');
const get = require('lodash/get');
const User = require('../../models/User');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeSendEmail = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id');
  const isVendorUser = get(req, 'auth.credentials.role.vendor');

  const user = await User.findOne({ 'local.email': req.payload.email }).lean();

  if (!user) throw Boom.notFound(translate[language].userNotFound);
  if (!isVendorUser && user.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

  return null;
};
