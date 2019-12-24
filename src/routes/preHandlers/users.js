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

exports.authorizeUserCreation = async (req) => {
  const { credentials } = req.auth;

  if (req.payload.customers && req.payload.customers.length) {
    const { customers } = req.payload;
    const customersCount = await Customer.countDocuments({
      _id: { $in: customers },
      company: get(credentials, 'company._id', null),
    });
    if (customersCount !== customers.length) throw Boom.forbidden();
  }

  if (req.payload.company && !credentials.scope.includes('superAdmin')) {
    throw Boom.forbidden();
  }

  return null;
};

exports.authorizeUserGet = async (req) => {
  const { auth, query } = req;
  const companyId = get(auth.credentials, 'company._id', null);

  if (query.email) {
    const user = await User.findOne({ email: query.email, company: companyId }).lean();
    if (!user) throw Boom.forbidden();
  }

  if (query.customers) {
    const customers = Array.isArray(query.customers) ? query.customers : [query.customers];
    const customersCount = await Customer.countDocuments({ _id: { $in: customers }, company: companyId });
    if (customersCount !== customers.length) throw Boom.forbidden();
  }

  return null;
};
