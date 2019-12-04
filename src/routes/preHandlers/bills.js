const Boom = require('boom');
const Bill = require('../../models/Bill');
const Customer = require('../../models/Customer');
const Event = require('../../models/Event');
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

  const customer = await Customer.findOne({ _id: bill.customer, company: credentials.company._id }).lean();
  if (!customer) throw Boom.forbidden();
  if (!credentials.scope.includes('bills:read')) {
    if (!credentials.scope.includes(`customer-${bill.customer.toHexString()}`)) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeBillCreation = async (req) => {
  const { credentials } = req.auth;
  const { bills } = req.payload;
  const companyId = credentials.company._id;

  const customersIds = [...new Set(bills.map(bill => bill.customerId))];
  const customerCount = await Customer.countDocuments({ _id: { $in: customersIds }, company: companyId });
  if (customerCount !== customersIds.length) throw Boom.forbidden();

  const ids = { subscriptionsIds: new Set(), eventsIds: new Set() };

  for (const bill of bills) {
    for (const customerBill of bill.customerBills.bills) {
      ids.eventsIds.add(...customerBill.eventsList.map(ev => ev.event));
      ids.subscriptionsIds.add(customerBill.subscription._id);
    }

    if (bill.thirdPartyPayerBills && bill.thirdPartyPayerBills.length) {
      for (const tpp of bill.thirdPartyPayerBills) {
        for (const tppBill of tpp.bills) {
          ids.eventsIds.add(...tppBill.eventsList.map(ev => ev.event));
          ids.subscriptionsIds.add(tppBill.subscription._id);
        }
      }
    }
  }

  const eventsCount = await Event.countDocuments({ _id: { $in: [...ids.eventsIds] }, company: companyId });
  if (eventsCount !== ids.eventsIds.size) throw Boom.forbidden();
  const subscriptionsCount = await Customer.countDocuments({
    'subscriptions._id': { $in: [...ids.subscriptionsIds] },
    company: companyId,
  });
  if (subscriptionsCount !== ids.subscriptionsIds.size) throw Boom.forbidden();

  return null;
};
