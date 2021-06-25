const Boom = require('@hapi/boom');
const get = require('lodash/get');
const AdministrativeDocument = require('../../models/AdministrativeDocument');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeAdministrativeDocumentDeletion = async (req) => {
  try {
    const administrativeDocument = await AdministrativeDocument
      .countDocuments({ _id: req.params._id, company: get(req, 'auth.credentials.company._id', null) });

    if (!administrativeDocument) throw Boom.notFound(translate[language].administrativeDocumentNotFound);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
