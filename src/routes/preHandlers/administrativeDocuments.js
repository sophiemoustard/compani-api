const Boom = require('boom');
const get = require('lodash/get');
const AdministrativeDocument = require('../../models/AdministrativeDocument');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeAdministrativeDocumentDeletion = async (req) => {
  try {
    const { credentials } = req.auth;
    const administrativeDocumentId = req.params._id;
    const administrativeDocument = await AdministrativeDocument.findOne({
      _id: administrativeDocumentId,
      company: get(credentials, 'company._id', null),
    }).lean();
    if (!administrativeDocument) throw Boom.notFound(translate[language].administrativeDocumentNotFound);
    return administrativeDocument;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
