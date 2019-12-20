const Boom = require('boom');
const User = require('../../models/User');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getUser = async (req) => {
  try {
    const userId = req.params._id;
    const user = await User.findById(userId).lean();
    if (!user) throw Boom.notFound(translate[language].userNotFound);

    return user;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeUserUpdate = (req) => {
  const { credentials } = req.auth;
  const user = req.pre.user || req.payload;

  if (user.company.toHexString() === credentials.company._id.toHexString()) return null;

  throw Boom.forbidden();
};

exports.authorizeUserGet = (req) => {
  const { credentials } = req.auth;
  const customerId = req.payload.customer;
  if (!customerId) return null;

  const customer = Customer.findOne({ _id: customerId, company: get(credentials, 'company._id', null) });
  if (!customer) throw Boom.forbidden();
  return null;
};
