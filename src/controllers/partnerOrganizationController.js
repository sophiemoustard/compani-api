const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const PartnerOrganizationsHelper = require('../helpers/partnerOrganizations');

const { language } = translate;

const create = async (req) => {
  try {
    await PartnerOrganizationsHelper.create(req.payload, req.auth.credentials);

    return { message: translate[language].partnerOrganizationCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const partnerOrganizations = await PartnerOrganizationsHelper.list(req.auth.credentials);

    return { message: translate[language].partnerOrganizationsFound, data: { partnerOrganizations } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list };
