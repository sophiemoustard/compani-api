const Boom = require('boom');
const get = require('lodash/get');
const authenticationHelper = require('../helpers/authentication');
const randomize = require('randomatic');
const ActivationCode = require('../models/ActivationCode');

exports.createActivationCode = async (payload, credentials) => {
  const payloadActivationCode = {
    ...payload,
    code: payload.code || randomize('0000'),
    firstSMS: Date.now(),
    company: get(credentials, 'company._id', null),
  };
  return ActivationCode.create(payloadActivationCode);
};

exports.checkActivationCode = async (params) => {
  const code = await ActivationCode
    .findOne({ code: params.code })
    .populate({ path: 'user', select: '_id isConfirmed local.email' })
    .lean();

  if (get(code, 'user.isConfirmed', false)) throw Boom.badData();

  // 2 days expire
  const expireTime = 604800;
  const tokenPayload = { _id: code.user._id, userEmail: get(code, 'user.local.email') };
  const token = authenticationHelper.encode(tokenPayload, expireTime);
  return { ...code, token };
};
