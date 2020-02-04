const Boom = require('boom');
const AdministrativeDocument = require('../../models/AdministrativeDocument');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getAdministrativeDocument = async (req) => {
  try {
    const administrativeDocumentId = req.params._id;
    const administrativeDocument = await AdministrativeDocument.findById(administrativeDocumentId).lean();
    if (!administrativeDocument) throw Boom.notFound(translate[language].administrativeDocumentNotFound);
    return administrativeDocument;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeAdministrativeDocumentRemoval = (req) => {
  const { credentials } = req.auth;
  const administrativeDocument = req.pre.administrativeDocument || req.payload;
  if (administrativeDocument.company.toHexString() === credentials.company._id.toHexString()) return null;

  throw Boom.forbidden();
};
