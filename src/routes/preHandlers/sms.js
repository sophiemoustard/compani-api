const Boom = require('@hapi/boom');
const get = require('lodash/get');
const User = require('../../models/User');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');

const { language } = translate;

exports.authorizeSendSms = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id');
  const users = await User
    .find({ 'contact.phone': `0${req.payload.recipient.substring(3)}` })
    .populate({ path: 'company' })
    .lean();
  if (!users.length) throw Boom.notFound(translate[language].userNotFound);

  const userCompanies = users.map(user => user.company);
  if (!UtilsHelper.doesArrayIncludeId(userCompanies, companyId)) throw Boom.notFound();

  return null;
};
