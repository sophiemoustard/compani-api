const jwt = require('jsonwebtoken');
const Boom = require('@hapi/boom');
const moment = require('moment');
const bcrypt = require('bcrypt');
const pickBy = require('lodash/pickBy');
const get = require('lodash/get');
const flat = require('flat');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { TOKEN_EXPIRE_TIME } = require('../models/User');
const translate = require('./translate');
const { MOBILE, EMAIL } = require('./constants');
const EmailHelper = require('./email');
const IdentityVerification = require('../models/IdentityVerification');

const { language } = translate;

exports.encode = (payload, expireTime) =>
  jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: expireTime || '24h' });

exports.authenticate = async (payload) => {
  const user = await User
    .findOne({ 'local.email': payload.email.toLowerCase() })
    .select('local refreshToken')
    .lean();
  const correctPassword = get(user, 'local.password') || '';
  const isCorrect = await bcrypt.compare(payload.password, correctPassword);
  if (!user || !user.refreshToken || !correctPassword || !isCorrect) throw Boom.unauthorized();

  const tokenPayload = { _id: user._id.toHexString() };
  const token = exports.encode(tokenPayload, TOKEN_EXPIRE_TIME);

  if (payload.origin === MOBILE && !user.firstMobileConnection) {
    await User.updateOne(
      { _id: user._id, firstMobileConnection: { $exists: false } },
      { $set: { firstMobileConnection: moment().toDate() } }
    );
  }

  return {
    token,
    tokenExpireDate: moment().add(TOKEN_EXPIRE_TIME, 'seconds').toDate(),
    refreshToken: user.refreshToken,
    user: tokenPayload,
  };
};

exports.refreshToken = async (refreshToken) => {
  const user = await User.findOne({ refreshToken }).lean();
  if (!user) throw Boom.unauthorized();

  const tokenPayload = { _id: user._id.toHexString() };
  const token = exports.encode(tokenPayload, TOKEN_EXPIRE_TIME);

  return {
    token,
    tokenExpireDate: moment().add(TOKEN_EXPIRE_TIME, 'seconds').toDate(),
    refreshToken,
    user: tokenPayload,
  };
};

exports.updatePassword = async (userId, userPayload) => User.findOneAndUpdate(
  { _id: userId },
  { $set: flat(userPayload), $unset: { passwordToken: '' } },
  { new: true }
).lean();

exports.checkPasswordToken = async (token) => {
  const filter = { passwordToken: { token, expiresIn: { $gt: Date.now() } } };
  const user = await User.findOne(flat(filter, { maxDepth: 2 })).select('local').lean();
  if (!user) throw Boom.notFound(translate[language].userNotFound);

  const payload = { _id: user._id, email: user.local.email };
  const userPayload = pickBy(payload);
  const expireTime = 86400;

  return { token: exports.encode(userPayload, expireTime), user: userPayload };
};

exports.createPasswordToken = async email => exports.generatePasswordToken(email, 24 * 3600 * 1000); // 1 day

exports.forgotPassword = async (payload) => {
  const { email, origin, type } = payload;
  if (origin === MOBILE && type === EMAIL) {
    const verification = await IdentityVerification.create({
      creationDate: Date.now(),
      email,
      verificationCode: Math.floor(Math.random() * Math.floor(10000)),
    });
    return EmailHelper.verificationCodeEmail(email, verification.verificationCode);
  }

  const passwordToken = await exports.generatePasswordToken(email, 3600000);
  return EmailHelper.forgotPasswordEmail(email, passwordToken);
};

exports.generatePasswordToken = async (email, time) => {
  const payload = { passwordToken: { token: uuidv4(), expiresIn: Date.now() + time } };
  const user = await User.findOneAndUpdate({ 'local.email': email }, { $set: payload }, { new: true }).lean();
  if (!user) throw Boom.notFound(translate[language].userNotFound);

  return payload.passwordToken;
};
