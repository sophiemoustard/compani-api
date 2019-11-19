const Boom = require('boom');
const get = require('lodash/get');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getCustomer = async (req) => {
  try {
    const customer = await Customer.findOne({ _id: req.params._id, company: get(req, 'auth.credentials.company._id', null) }).populate({ path: 'firstIntervention', select: 'startDate' });
    if (!customer) throw Boom.notFound(translate[language].customerNotFound);

    return customer;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCustomerUpdate = async (req) => {
  if (!get(req, 'auth.credentials.company._id', null)) throw Boom.forbidden();
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findOne({ _id: req.params._id, company: companyId }).lean();
  if (!customer) throw Boom.notFound(translate[language].customerNotFound);
  return null;
};

exports.authorizeCustomerDelete = async (req) => {
  const { customer } = req.pre;

  if (customer.firstIntervention) throw Boom.forbidden();

  return null;
};
