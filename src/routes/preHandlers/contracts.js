const Boom = require('boom');
const Contract = require('../../models/Contract');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getContract = async (req) => {
  try {
    const contract = await Contract.findOne({ _id: req.params._id }).lean();
    if (!contract) throw Boom.notFound(translate[language].contractNotFound);

    return contract;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeContractEdition = async (req) => {
  const { credentials } = req.auth;
  const { contract } = req.pre;

  if (credentials.scope.includes('contracts:edit')) return null;
  if (credentials.scope.includes(`user-${contract.user.toHexString()}`)) return null;
  if (contract.customer && credentials.scope.includes(`customer-${contract.customer.toHexString()}`)) return null;

  throw Boom.forbidden();
};
