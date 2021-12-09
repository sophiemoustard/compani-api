const get = require('lodash/get');
const Boom = require('@hapi/boom');
const UtilsHelper = require('../../helpers/utils');
const Customer = require('../../models/Customer');
const CustomerAbsence = require('../../models/CustomerAbsence');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeCustomerAbsenceGet = async (req) => {
  const { credentials } = req.auth;
  const companyId = get(credentials, 'company._id');

  const customers = UtilsHelper.formatIdsArray(req.query.customer);
  const customerCount = await Customer.countDocuments({ _id: { $in: customers }, company: companyId });
  if (customerCount !== customers.length) throw Boom.notFound();

  return null;
};

exports.authorizeCustomerAbsenceUpdate = async (req) => {
  const { auth, params, payload } = req;
  const companyId = get(auth, 'credentials.company._id');

  const customerAbsence = await CustomerAbsence.findOne({ _id: params._id, company: companyId }).lean();
  if (!customerAbsence) throw Boom.notFound();

  const customerAbsenceCount = await CustomerAbsence.countDocuments({
    _id: { $ne: customerAbsence._id },
    customer: customerAbsence.customer,
    $and: [{ startDate: { $lte: payload.endDate } }, { endDate: { $gte: payload.startDate } }],
    company: companyId,
  });
  if (customerAbsenceCount) throw Boom.forbidden(translate[language].customerAbsencesConflict);

  const customerCount = await Customer.countDocuments({
    _id: customerAbsence.customer,
    company: companyId,
    stoppedAt: { $lte: payload.endDate },
  });
  if (customerCount) throw Boom.forbidden(translate[language].stoppedCustomer);

  return null;
};
