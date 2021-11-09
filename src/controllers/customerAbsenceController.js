const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const CustomerAbsenceHelper = require('../helpers/customerAbsences');

const { language } = translate;

const list = async (req) => {
  try {
    const customerAbsences = await CustomerAbsenceHelper.list(req.query, req.auth.credentials);

    return {
      message: customerAbsences.length === 0
        ? translate[language].customerAbsencesNotFound
        : translate[language].customerAbsencesFound,
      data: { customerAbsences },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list };
