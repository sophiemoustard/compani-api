const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const AuthenticationHelper = require('../helpers/authentication');

const { language } = translate;

const authenticate = async (req, h) => {
  try {
    const authentication = await AuthenticationHelper.authenticate(req.payload);
    req.log('info', `${req.payload.email} connected`);

    return h.response({ message: translate[language].userAuthentified, data: { ...authentication } })
      .state('alenvi_token', authentication.token)
      .state('refresh_token', authentication.refreshToken)
      .state('user_id', authentication.user._id);
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

/**
 * From MOBILE, refreshToken is in the payload
 * From WEBAPP, refresh_token is in the state
 */
const refreshToken = async (req, h) => {
  try {
    const userRefreshToken = get(req, 'payload.refreshToken') || get(req, 'state.refresh_token');
    const token = await AuthenticationHelper.refreshToken(userRefreshToken);

    return h.response({ message: translate[language].userAuthentified, data: { ...token } })
      .state('alenvi_token', token.token)
      .state('refresh_token', token.refreshToken)
      .state('user_id', token.user._id);
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const logout = async (req, h) => {
  try {
    return h.response({ message: translate[language].userAuthentified })
      .unstate('alenvi_token')
      .unstate('refresh_token')
      .unstate('user_id');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createPasswordToken = async (req) => {
  try {
    const passwordToken = await AuthenticationHelper.createPasswordToken(req.payload.email);

    return {
      message: translate[language].resetPasswordTokenFound,
      data: { passwordToken },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const forgotPassword = async (req) => {
  try {
    const mailInfo = await AuthenticationHelper.forgotPassword(req.payload.email);

    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const checkPasswordToken = async (req, h) => {
  try {
    const token = await AuthenticationHelper.checkPasswordToken(req.params.token);

    return h.response({ message: translate[language].resetPasswordTokenFound, data: { ...token } })
      .state('alenvi_token', token.token);
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updatePassword = async (req) => {
  try {
    const updatedUser = await AuthenticationHelper.updatePassword(req.params._id, req.payload);

    return { message: translate[language].userUpdated, data: { updatedUser } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  authenticate,
  logout,
  createPasswordToken,
  refreshToken,
  forgotPassword,
  checkPasswordToken,
  updatePassword,
};
