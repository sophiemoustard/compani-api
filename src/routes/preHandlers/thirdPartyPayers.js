const Boom = require('boom');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeThirdPartyPayersUpdate = async (req) => {
  if (!req.auth.credentials.company || !req.auth.credentials.company._id) throw Boom.forbidden();
  const companyId = req.auth.credentials.company._id;
  const thirdPartyPayer = await ThirdPartyPayer.findOne({ _id: req.params._id }).lean();
  if (!thirdPartyPayer) throw Boom.notFound(translate[language].thirdPartyPayerNotFound);
  if (thirdPartyPayer.company.toHexString() === companyId.toHexString()) return null;

  throw Boom.forbidden();
};
