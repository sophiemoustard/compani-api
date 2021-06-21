const Boom = require('@hapi/boom');
const get = require('lodash/get');
const UserCompany = require('../../models/UserCompany');
const PayDocument = require('../../models/PayDocument');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizePayDocumentCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const user = await UserCompany.countDocuments({ user: req.payload.user, company: companyId });
  if (!user) throw Boom.notFound(translate[language].userNotFound);

  return null;
};

exports.authorizePayDocumentDeletion = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const payDocument = await PayDocument.countDocuments({ _id: req.params._id, company: companyId });
  if (!payDocument) throw Boom.notFound(translate[language].payDocumentsNotFound);

  return null;
};

exports.authorizeGetPayDocuments = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const user = await UserCompany.countDocuments({ user: req.query.user, company: companyId });
  if (!user) throw Boom.notFound(translate[language].userNotFound);

  return null;
};
