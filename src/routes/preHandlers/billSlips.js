const Boom = require('@hapi/boom');
const get = require('lodash/get');
const BillSlip = require('../../models/BillSlip');

exports.authorizeGetBillSlipDocx = async (req) => {
  try {
    const companyId = get(req, 'auth.credentials.company._id', null);
    const billSlip = await BillSlip.countDocuments({ _id: req.params._id, company: companyId });

    if (!billSlip) throw Boom.notFound();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
