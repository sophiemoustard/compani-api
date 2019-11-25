const randomize = require('randomatic');
const Boom = require('boom');
const get = require('lodash/get');
const { encode } = require('../helpers/authentication');
const ActivationCode = require('../models/ActivationCode');
const translate = require('../helpers/translate');

const { language } = translate;

const createActivationCode = async (req) => {
  try {
    const payload = {
      ...req.payload,
      code: req.payload.code || randomize('0000'),
      firstSMS: Date.now(),
    };
    const activationCode = new ActivationCode(payload);
    await activationCode.save();

    return { message: translate[language].activationCodeCreated, data: { activationCode } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(translate[language].unexpectedBehavior);
  }
};

const checkActivationCode = async (req) => {
  try {
    const code = await ActivationCode
      .findOne({ code: req.params.code })
      .populate({ path: 'user', select: '_id isConfirmed local.email' })
      .lean();
    if (!code) return Boom.notFound(translate[language].activationCodeNotFoundOrInvalid);
    if (get(code, 'user.isConfirmed', false)) return Boom.badData();

    // 2 days expire
    const expireTime = 604800;
    const tokenPayload = { _id: code.user._id, userEmail: get(code, 'user.local.email') };
    const token = encode(tokenPayload, expireTime);

    return {
      message: translate[language].activationCodeValidated,
      data: { activationCode: { ...code, token } },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(translate[language].unexpectedBehavior);
  }
};

module.exports = {
  createActivationCode,
  checkActivationCode,
};
