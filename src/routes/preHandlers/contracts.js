const Boom = require('boom');
const get = require('lodash/get');
const Contract = require('../../models/Contract');
const User = require('../../models/User');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getContract = async (req) => {
  try {
    const contract = await Contract.findOne({ _id: req.params._id }).lean();
    if (!contract) throw Boom.notFound(translate[language].contractNotFound);

    return contract;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeContractCreation = async (req) => {
  const { payload } = req;
  const { credentials } = req.auth;
  const companyId = credentials.company._id.toHexString();

  if (payload.customer) {
    const customer = await Customer.findOne({ _id: payload.customer }, { company: 1 }).lean();
    if (customer.company.toHexString() !== companyId) throw Boom.forbidden();
  }

  const user = await User.findOne({ _id: payload.user }, { company: 1 }).lean();
  if (!user) throw Boom.forbidden();
  if (user.company.toHexString() !== companyId) throw Boom.forbidden();

  return null;
};

exports.authorizeContractUpdate = async (req) => {
  const { credentials } = req.auth;
  const { contract } = req.pre;

  if (credentials.company._id.toHexString() !== contract.company.toHexString()) throw Boom.forbidden();
  if (!req.path.match(/upload/) && !!contract.endDate) throw Boom.forbidden();

  return null;
};

exports.authorizeGetContract = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findOne({ _id: req.query.customer, company: companyId });
  const user = await User.findOne({ _id: req.query.user, company: companyId });
  if ((customer || !req.query.customer) && (user || !req.query.user)) return null;
  throw Boom.forbidden();
};
