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

module.exports = { create };
