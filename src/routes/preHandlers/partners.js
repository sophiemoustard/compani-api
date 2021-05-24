const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Partner = require('../../models/Partner');

exports.authorizePartnerUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const partnerCount = await Partner.countDocuments({ _id: req.params._id, company: companyId });
  if (!partnerCount) throw Boom.notFound();

  return null;
};
