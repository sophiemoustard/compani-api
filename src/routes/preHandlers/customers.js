const Boom = require('boom');
const get = require('lodash/get');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getCustomer = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    if (!companyId) throw Boom.forbidden();
    const customer = await Customer.findById(req.params._id).populate({ path: 'firstIntervention', select: 'startDate' });
    if (!customer) throw Boom.notFound(translate[language].customerNotFound);

    if (customer.company.toHexString() === companyId.toHexString()) return customer;

    throw Boom.forbidden();
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCustomerUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (!companyId) throw Boom.forbidden();
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
