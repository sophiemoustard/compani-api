const Boom = require('@hapi/boom');
const InternalHourHelper = require('../helpers/internalHours');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const internalHours = await InternalHourHelper.list(req.auth.credentials);

    return {
      message: translate[language].companyInternalHoursFound,
      data: { internalHours },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list };
