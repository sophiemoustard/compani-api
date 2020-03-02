const User = require('../../models/User');
const ActivationCode = require('../../models/ActivationCode');
const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeActivationCodeCreate = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    const user = await User.findOne({ _id: req.payload.user, company: companyId }).lean();
    if (!user) throw Boom.notFound(translate[language].customerNotFound);
    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeActivationCodeGet = async (req) => {
  try {
    const code = await ActivationCode.findOne({ code: req.params.code }).lean();
    if (!code) throw Boom.notFound(translate[language].activationCodeNotFoundOrInvalid);

    const user = await User.findById(code.user).lean();
    if (!user) throw Boom.forbidden();

    if (code.company.toHexString() !== user.company._id.toHexString()) throw Boom.forbidden();
    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
