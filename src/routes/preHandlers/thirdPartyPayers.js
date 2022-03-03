const Boom = require('@hapi/boom');
const get = require('lodash/get');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeThirdPartyPayersCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const nameAlreadyExists = await ThirdPartyPayer
    .countDocuments({ name: req.payload.name, company: companyId }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].thirdPartyPayerExits);

  return null;
};

exports.authorizeThirdPartyPayersUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const ttpExists = await ThirdPartyPayer.countDocuments({ _id: req.params._id, company: companyId });
  if (!ttpExists) throw Boom.notFound(translate[language].thirdPartyPayerNotFound);

  const nameAlreadyExists = await ThirdPartyPayer
    .countDocuments({
      _id: { $ne: req.params._id },
      name: req.payload.name,
      company: companyId,
    }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].thirdPartyPayerExits);

  return null;
};

exports.authorizeThirdPartyPayerDeletion = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const ttpExists = await ThirdPartyPayer.countDocuments({ _id: req.params._id, company: companyId });
  if (!ttpExists) throw Boom.notFound(translate[language].thirdPartyPayerNotFound);

  return null;
};
