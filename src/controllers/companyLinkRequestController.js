const Boom = require('@hapi/boom');
const CompanyLinkRequestsHelper = require('../helpers/companyLinkRequests');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    await CompanyLinkRequestsHelper.create(req.payload, req.auth.credentials);

    return { message: translate[language].companyLinkRequestCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const companyLinkRequests = await CompanyLinkRequestsHelper.list(req.auth.credentials);

    return { data: { companyLinkRequests }, message: translate[language].companyLinkRequestsFound };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await CompanyLinkRequestsHelper.removeCompanyLinkRequest(req.params._id);

    return { message: translate[language].companyLinkRequestDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list, remove };
