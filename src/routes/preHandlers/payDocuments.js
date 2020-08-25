const Boom = require('@hapi/boom');
const get = require('lodash/get');
const User = require('../../models/User');
const PayDocument = require('../../models/PayDocument');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizePayDocumentCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const user = await User.findOne({ _id: req.payload.user, company: companyId }).lean();
  if (!user) throw Boom.forbidden();

  return null;
};

exports.authorizePayDocumentDeletion = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const payDocument = await PayDocument.findOne({ _id: req.params._id, company: companyId }).lean();
  if (!payDocument) throw Boom.notFound(translate[language].payDocumentsNotFound);

  const user = await User.findOne({ _id: payDocument.user, company: companyId }).lean();
  if (!user) throw Boom.forbidden();

  return null;
};

exports.authorizeGetPayDocuments = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const user = await User.findOne({ _id: req.query.user, company: companyId }).lean();
  if (!user) throw Boom.forbidden();

  return null;
};
