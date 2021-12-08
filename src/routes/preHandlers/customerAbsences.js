const get = require('lodash/get');
const Boom = require('@hapi/boom');
const UtilsHelper = require('../../helpers/utils');
const Customer = require('../../models/Customer');
const CustomerAbsence = require('../../models/CustomerAbsence');

exports.authorizeCustomerAbsenceGet = async (req) => {
  const { credentials } = req.auth;
  const companyId = get(credentials, 'company._id');

  const customers = UtilsHelper.formatIdsArray(req.query.customer);
  const customerCount = await Customer.countDocuments({ _id: { $in: customers }, company: companyId });
  if (customerCount !== customers.length) throw Boom.notFound();

  return null;
};

exports.authorizeCustomerAbsenceUpdate = async (req) => {
  const { auth, params } = req;
  const companyId = get(auth, 'credentials.company._id');

  const customerAbsence = await CustomerAbsence.findOne({ _id: params._id, company: companyId }).lean();
  if (!customerAbsence) throw Boom.notFound();

  // const customerAbsenceCount = CustomerAbsence.countDocuments({
  //   customer: customerAbsence.customer,
  //   $and: [{ startDate: { $lte: payload.endDate } }, { endDate: { $gte: payload.startDate } }],
  //   company: companyId,
  // });
  // console.log(customerAbsenceCount);
  // if (customerAbsenceCount) throw Boom.forbidden('Une absence existe deja sur cette periode');

  return null;
};
