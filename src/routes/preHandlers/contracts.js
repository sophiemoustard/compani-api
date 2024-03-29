const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Contract = require('../../models/Contract');
const UserCompany = require('../../models/UserCompany');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getContract = async (req) => {
  try {
    const loggedCompanyId = get(req, 'auth.credentials.company._id');
    const contract = await Contract.findOne({ _id: req.params._id, company: loggedCompanyId }).lean();
    if (!contract) throw Boom.notFound(translate[language].contractNotFound);

    return contract;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeContractCreation = async (req) => {
  const { payload } = req;
  const { credentials } = req.auth;
  const companyId = credentials.company._id.toHexString();

  const user = await UserCompany.countDocuments({ user: payload.user, company: companyId });
  if (!user) throw Boom.notFound();

  return null;
};

exports.authorizeContractUpdate = async (req) => {
  const { contract } = req.pre;
  if (contract.endDate) throw Boom.forbidden();

  return null;
};

exports.authorizeGetContract = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  if (req.query.user) {
    const user = await UserCompany.countDocuments({ user: req.query.user, company: companyId });
    if (!user) throw Boom.notFound();
  }

  return null;
};

exports.authorizeUpload = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const customer = await Customer.countDocuments({ _id: req.payload.customer, company: companyId });
  if (req.payload.customer && !customer) throw Boom.forbidden();

  return null;
};
