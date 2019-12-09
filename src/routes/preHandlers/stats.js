const Boom = require('boom');
const get = require('lodash/get');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeGetStats = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.findById(req.query.customer).lean();

  if (!customer) throw Boom.notFound(translate[language].customerNotFound);

  if (customer.company.toHexString() === companyId.toHexString()) return null;

  throw Boom.forbidden();
};
