const Boom = require('boom');
const get = require('lodash/get');
const User = require('../../models/User');
const Sector = require('../../models/Sector');
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

exports.authorizeUserUpdate = async (req) => {
  const { credentials } = req.auth;
  const user = req.pre.user || req.payload;
  const companyId = get(credentials, 'company._id', null);

  if (get(req, 'payload.sector', null)) {
    const sector = await Sector.findOne({ _id: req.payload.sector, company: companyId }).lean();
    if (!sector) throw Boom.forbidden();
  }

  if (user.company.toHexString() === companyId.toHexString()) return null;

  throw Boom.forbidden();
};

exports.authorizeUserCreation = (req) => {
  const { credentials } = req.auth;
  const customerId = req.payload.customer;
  if (!customerId) return null;

  const customer = Customer.findOne({ _id: customerId, company: get(credentials, 'company._id', null) }).lean();
  if (!customer) throw Boom.forbidden();
  return null;
};

exports.authorizeUserGet = async (req) => {
  const { credentials } = req.auth;
  if (!req.query.email) return null;
  const user = await User.findOne({ email: req.query.email, company: get(credentials, 'company._id', null) }).lean();
  if (!user) throw Boom.forbidden();
  return null;
};
