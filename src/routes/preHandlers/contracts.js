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

exports.authorizeContractUpdate = async (req) => {
  const { credentials } = req.auth;
  const { contract } = req.pre;

  if (credentials.company._id.toHexString() !== contract.company.toHexString()) throw Boom.forbidden();
  if (!req.path.match(/upload/) && !!contract.endDate) throw Boom.forbidden();

  return null;
};
