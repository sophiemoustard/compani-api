const Boom = require('boom');
const get = require('lodash/get');
const User = require('../../models/User');
const PayDocument = require('../../models/PayDocument');

exports.authorizePayDocumentCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const user = await User.findOne({ _id: req.payload.user, company: companyId }).lean();
  if (!user) throw Boom.forbidden();

  return null;
};

exports.authorizePayDocumentDeletion = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const payDocument = await PayDocument.findById(req.params._id);
  if (!payDocument) throw Boom.notFound();

  const user = await User.findOne({ _id: payDocument.user, company: companyId }).lean();
  if (!user) throw Boom.forbidden();

  return null;
};

exports.authorizeGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (!req.query.user) return null;

  const user = await User.findOne({ _id: req.query.user, company: companyId });
  if (!user) throw Boom.forbidden();
  return null;
};

