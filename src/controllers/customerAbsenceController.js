const Boom = require('@hapi/boom');
const get = require('lodash/get');
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
    const { payload, params, auth } = req;
    const companyId = get(auth, 'credentials.company._id');

    const customerAbsenceId = params._id;

    await CustomerAbsencesHelper.updateCustomerAbsence(customerAbsenceId, payload, companyId);

    return { message: translate[language].customerAbsenceUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, update };
