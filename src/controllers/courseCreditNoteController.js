const Boom = require('@hapi/boom');
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

module.exports = { create };
