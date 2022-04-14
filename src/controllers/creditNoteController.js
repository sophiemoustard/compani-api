const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const CreditNoteHelper = require('../helpers/creditNotes');

const { language } = translate;

const list = async (req) => {
  try {
    const creditNotes = await CreditNoteHelper.getCreditNotes(req.query, req.auth.credentials);

    return {
      message: creditNotes.length === 0
        ? translate[language].creditNotesNotFound
        : translate[language].creditNotesFound,
      data: { creditNotes },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    await CreditNoteHelper.createCreditNotes(req.payload, req.auth.credentials);

    return {
      message: translate[language].creditNoteCreated,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const updatedCreditNote = await CreditNoteHelper.updateCreditNotes(
      req.pre.creditNote,
      req.payload,
      req.auth.credentials
    );

    return {
      message: translate[language].creditNoteUpdated,
      data: { creditNote: updatedCreditNote },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await CreditNoteHelper.removeCreditNote(req.pre.creditNote, req.auth.credentials, req.params);
    return {
      message: translate[language].creditNoteDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const generateCreditNotePdf = async (req, h) => {
  try {
    req.log('creditNoteController - generateCreditNotePdf - params', req.params);
    req.log('creditNoteController - generateCreditNotePdf - company', get(req, 'auth.credentials.company._id'));

    const { pdf, creditNoteNumber } = await CreditNoteHelper.generateCreditNotePdf(req.params, req.auth.credentials);

    return h.response(pdf)
      .header('content-disposition', `inline; filename=${creditNoteNumber}.pdf`)
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
  generateCreditNotePdf,
};
