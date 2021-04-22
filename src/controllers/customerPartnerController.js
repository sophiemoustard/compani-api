const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const CustomerPartnerHelper = require('../helpers/customerPartners');

const { language } = translate;

const create = async (req) => {
  try {
    const customerPartner = await CustomerPartnerHelper.createCustomerPartner(req.payload, req.auth.credentials);

    return {
      message: translate[language].customerPartnerCreated,
      data: { customerPartner },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create };
