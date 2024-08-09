const Boom = require('@hapi/boom');
const Bill = require('../../models/Bill');
const Customer = require('../../models/Customer');
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

exports.authorizeGetBillPdf = async (req) => {
  const { credentials } = req.auth;
  const { bill } = req.pre;
  const canRead = credentials.scope.includes('bills:read');
  const isHelpersCustomer = credentials.scope.includes(`customer-${bill.customer.toHexString()}`);
  if (!canRead && !isHelpersCustomer) throw Boom.forbidden();

  const customer = await Customer.countDocuments({ _id: bill.customer, company: credentials.company._id });
  if (!customer) throw Boom.notFound();

  return null;
};
