const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const VendorCompanyHelper = require('../helpers/vendorCompany');

const { language } = translate;

const get = async (req) => {
  try {
    const vendorCompany = await VendorCompanyHelper.get(req.auth.credentials);

    return {
      message: translate[language].vendorCompanyFound,
      data: vendorCompany,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { get };
