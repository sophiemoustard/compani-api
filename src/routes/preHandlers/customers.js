const Boom = require('boom');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getCustomer = async (req) => {
  try {
    const customer = await Customer.findById(req.params._id);
    if (!customer) throw Boom.notFound(translate[language].customerNotFound);

    return customer;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCustomerDelete = async (req) => {
  const { customer } = req.pre;

  if (!customer.firstIntervention) throw Boom.forbidden();

  return null;
};
