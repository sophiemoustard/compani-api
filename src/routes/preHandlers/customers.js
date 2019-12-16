const Boom = require('boom');
const get = require('lodash/get');
const translate = require('../../helpers/translate');
const Customer = require('../../models/Customer');
const User = require('../../models/User');

const { language } = translate;

exports.getCustomer = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    const customer = await Customer
      .findById(req.params._id)
      // need the match as it is a virtual populate
      .populate({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } });
    if (!customer) throw Boom.notFound(translate[language].customerNotFound);

    if (customer.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

    return customer;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCustomerUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findById(req.params._id).lean();
  if (!customer) throw Boom.notFound(translate[language].customerNotFound);

  if (customer.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

  if (req.payload.referent) {
    const referent = await User.findOne({ _id: req.payload.referent, company: companyId });
    if (!referent) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeCustomerGetAndUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findById(req.params._id).lean();
  if (!customer) throw Boom.notFound(translate[language].customerNotFound);

  if (customer.company.toHexString() === companyId.toHexString()) return null;

  throw Boom.forbidden();
};

exports.authorizeCustomerDelete = async (req) => {
  const { customer } = req.pre;

  if (customer.firstIntervention) throw Boom.forbidden();

  return null;
};
