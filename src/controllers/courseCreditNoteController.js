const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseCreditNotesHelper = require('../helpers/courseCreditNotes');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    await CourseCreditNotesHelper.createCourseCreditNote(req.payload);

    return { message: translate[language].creditNoteCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const generateCreditNotePdf = async (req, h) => {
  try {
    req.log('courseCreditNoteController - generateCreditNotePdf - params', req.params);
    req.log('courseCreditNoteController - generateCreditNotePdf - company', get(req, 'auth.credentials.company._id'));

    const { pdf, creditNoteNumber } = await CourseCreditNotesHelper.generateCreditNotePdf(req.params._id);
    return h.response(pdf)
      .header('content-disposition', `inline; filename=${creditNoteNumber}.pdf`)
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, generateCreditNotePdf };
