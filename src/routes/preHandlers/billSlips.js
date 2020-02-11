const Boom = require('boom');
const get = require('lodash/get');
const BillSlip = require('../../models/BillSlip');

exports.authorizeGetBillSlipDocx = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    const billSlip = await BillSlip.findById(req.params._id).lean();

    if (!billSlip) throw Boom.notFound();
    if (billSlip.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
