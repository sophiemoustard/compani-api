const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { ObjectId } = require('mongodb');
const Bill = require('../../models/Bill');
const BillingItem = require('../../models/BillingItem');
const Customer = require('../../models/Customer');
const Event = require('../../models/Event');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const translate = require('../../helpers/translate');
const CustomerRepository = require('../../repositories/CustomerRepository');
const { MANUAL } = require('../../helpers/constants');
const { CompaniDate } = require('../../helpers/dates/companiDates');

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

exports.authorizeGetDraftBill = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  if (req.query.customer) {
    const customer = await Customer.countDocuments({ _id: req.query.customer, company: companyId });
    if (!customer) throw Boom.notFound();
  }

  return null;
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

const getUniqueIdsFromBills = (bills) => {
  const ids = { subscriptionsIds: new Set(), eventsIds: new Set(), tppIds: new Set(), billingItemsIds: new Set() };

  for (const bill of bills) {
    for (const customerBill of bill.customerBills.bills) {
      ids.eventsIds.add(...customerBill.eventsList.map(ev => ev.event));

      if (customerBill.subscription) ids.subscriptionsIds.add(customerBill.subscription._id);

      if (customerBill.billingItem) ids.billingItemsIds.add(customerBill.billingItem._id);
    }

    if (bill.thirdPartyPayerBills && bill.thirdPartyPayerBills.length) {
      for (const tpp of bill.thirdPartyPayerBills) {
        for (const tppBill of tpp.bills) {
          ids.eventsIds.add(...tppBill.eventsList.map(ev => ev.event));
          ids.subscriptionsIds.add(tppBill.subscription._id);
          ids.tppIds.add(tppBill.thirdPartyPayer._id);
        }
      }
    }
  }

  return ids;
};

exports.authorizeBillListCreation = async (req) => {
  const { credentials } = req.auth;
  const { bills } = req.payload;
  const companyId = credentials.company._id;

  const customersIds = [...new Set(bills.map(bill => bill.customer._id))];
  const customerCount = await Customer.countDocuments({
    _id: { $in: customersIds },
    archivedAt: { $eq: null },
    company: companyId,
  });
  if (customerCount !== customersIds.length) throw Boom.forbidden();

  const ids = getUniqueIdsFromBills(bills);

  const eventsCount = await Event.countDocuments({ _id: { $in: [...ids.eventsIds] }, company: companyId });
  if (eventsCount !== ids.eventsIds.size) throw Boom.forbidden();

  const subscriptionIds = [...ids.subscriptionsIds].map(sub => new ObjectId(sub));
  const subscriptions = await CustomerRepository.getSubscriptions(subscriptionIds, companyId);
  if (subscriptions.length !== ids.subscriptionsIds.size) throw Boom.forbidden();

  const billingItemsCount = await BillingItem.countDocuments({
    _id: { $in: [...ids.billingItemsIds] },
    company: companyId,
  });
  if (billingItemsCount !== ids.billingItemsIds.size) throw Boom.forbidden();

  const tppCount = await ThirdPartyPayer.countDocuments({ _id: { $in: [...ids.tppIds] }, company: companyId });
  if (tppCount !== ids.tppIds.size) throw Boom.forbidden();

  return null;
};

exports.authorizeGetBill = async (req) => {
  const { startDate, endDate } = req.query;

  if (startDate && endDate) {
    if (CompaniDate(endDate).isBefore(CompaniDate(startDate))) throw Boom.badRequest();
    const diff = CompaniDate(endDate).oldDiff(CompaniDate(startDate), 'years');
    if (get(diff, 'years') >= 1) throw Boom.forbidden(translate[language].periodMustBeLessThanOneYear);
  }

  return null;
};

exports.authorizeBillCreation = async (req) => {
  const { credentials } = req.auth;
  const companyId = credentials.company._id;

  const customer = await Customer.countDocuments({
    _id: req.payload.customer,
    company: companyId,
    archivedAt: { $eq: null },
  });
  if (!customer) throw Boom.forbidden();

  const billingItemIds = [...new Set(req.payload.billingItemList.map(bi => bi.billingItem))];
  const billingItems = await BillingItem
    .countDocuments({ _id: { $in: billingItemIds }, company: companyId, type: MANUAL });
  if (billingItems !== billingItemIds.length) throw Boom.forbidden();

  return null;
};
