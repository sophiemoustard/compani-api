const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Payment = require('../../models/Payment');
const Customer = require('../../models/Customer');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const translate = require('../../helpers/translate');
const { REFUND } = require('../../helpers/constants');

const { language } = translate;

exports.authorizePaymentUpdate = async (req) => {
  try {
    const { credentials } = req.auth;
    const payment = await Payment.findOne({ _id: req.params._id, company: credentials.company._id }).lean();
    if (!payment) throw Boom.notFound(translate[language].paymentNotFound);

    return payment;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentsListCreation = async (req) => {
  try {
    const { credentials } = req.auth;

    const customersIds = [...new Set(req.payload.map(payment => payment.customer))];
    const customersCount = await Customer.countDocuments({
      _id: { $in: customersIds },
      company: get(credentials, 'company._id'),
    });

    if (customersCount !== customersIds.length) throw Boom.notFound();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentCreation = async (req) => {
  try {
    const { credentials } = req.auth;
    const payment = req.payload;
    const companyId = get(credentials, 'company._id', null).toHexString();

    const customer = await Customer.countDocuments({ _id: payment.customer, company: companyId });
    if (!customer) throw Boom.notFound();

    if (payment.thirdPartyPayer) {
      const tpp = await ThirdPartyPayer.countDocuments({ _id: payment.thirdPartyPayer, company: companyId });
      if (!tpp) throw Boom.notFound();
    }

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizePaymentDeletion = async (req) => {
  const { payment } = req.pre;
  if (payment.nature !== REFUND) throw Boom.forbidden();

  return null;
};
