const Boom = require('@hapi/boom');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');

exports.authorizeDelivery = async (req) => {
  const tpp = await ThirdPartyPayer.findOne({ _id: req.query.thirdPartyPayer }).lean();
  if (!tpp) return Boom.notFound();
  if (!tpp.teletransmissionId) return Boom.forbidden();

  return null;
};
