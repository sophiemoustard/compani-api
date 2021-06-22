const Boom = require('@hapi/boom');
const CustomerNotesHelper = require('../helpers/customerNotes');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    const customerNotes = await CustomerNotesHelper.createCustomerNote(req.payload, req.auth.credentials);

    return { message: translate[language].customerNotesCreated, data: { customerNotes } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const customerNotes = await CustomerNotesHelper.list(req.query.customer, req.auth.credentials);

    return {
      message: customerNotes.length
        ? translate[language].customerNotesFound
        : translate[language].customerNotesNotFound,
      data: { customerNotes },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list };
