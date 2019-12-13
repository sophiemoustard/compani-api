const Boom = require('boom');
const get = require('lodash/get');
const Company = require('../../models/Company');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.companyExists = async (req) => {
  try {
    const company = await Company.findOne({ _id: req.params._id }).lean();
    if (!company) throw Boom.notFound(translate[language].CompanyNotFound);

    return true;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCompanyUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (!companyId) throw Boom.forbidden();
  if (req.params._id === companyId.toHexString()) return null;
  throw Boom.forbidden();
};
