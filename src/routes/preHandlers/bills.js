const Boom = require('boom');
const Bill = require('../../models/Bill');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getBill = async (req) => {
  try {
    const bill = await Bill.findOne({ _id: req.params._id }).lean();
    if (!bill) throw Boom.notFound(translate[language].billNotFound);

    return bill;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeBillReading = async (req) => {
  const { credentials } = req.auth;
  const { bill } = req.pre;

  if (credentials.scope.includes('bills:read')) return null;
  if (credentials.scope.includes(`customer-${bill.customer.toHexString()}`)) return null;

  throw Boom.forbidden();
};
