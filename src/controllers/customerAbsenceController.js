const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const CustomerAbsencesHelper = require('../helpers/customerAbsences');

const { language } = translate;

const list = async (req) => {
  try {
    const customerAbsences = await CustomerAbsencesHelper.list(req.query, req.auth.credentials);

    return {
      message: customerAbsences.length === 0
        ? translate[language].customerAbsenceNotFound
        : translate[language].customerAbsencesFound,
      data: { customerAbsences },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await CustomerAbsencesHelper.updateCustomerAbsence(req.params._id, req.payload, req.auth.credentials);

    return { message: translate[language].customerAbsenceUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, update };
