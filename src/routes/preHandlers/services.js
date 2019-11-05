const Boom = require('boom');
const Service = require('../../models/Service');

exports.authorizeServicesUpdate = async (req) => {
  if (!(req.auth.credentials.company && req.auth.credentials.company._id)) throw Boom.forbidden();
  const companyId = req.auth.credentials.company._id;
  const service = await Service.findOne({ _id: req.params._id }).lean();
  if (service.company.toHexString() === companyId.toHexString()) return null;

  throw Boom.forbidden();
};
