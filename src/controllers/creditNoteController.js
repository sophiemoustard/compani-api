const Boom = require('boom');

const get = require('lodash/get');
const CreditNote = require('../models/CreditNote');
const Company = require('../models/Company');
const translate = require('../helpers/translate');
const {
  updateEventAndFundingHistory,
  createCreditNotes,
  updateCreditNotes,
  getCreditNotes,
  formatPDF,
} = require('../helpers/creditNotes');
const { generatePdf } = require('../helpers/pdf');
const { COMPANI } = require('../helpers/constants');

const { language } = translate;

const list = async (req) => {
  try {
    const creditNotes = await getCreditNotes(req.query, req.auth.credentials);

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
    await createCreditNotes(req.payload, req.auth.credentials);

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
    const { creditNote } = req.pre;
    const updatedCreditNote = await updateCreditNotes(creditNote, req.payload, req.auth.credentials);

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
    const { creditNote } = req.pre;

    await updateEventAndFundingHistory(creditNote.events, true, req.auth.credentials);
    await CreditNote.findByIdAndRemove(req.params._id);
    if (creditNote.linkedCreditNote) await CreditNote.findByIdAndRemove(creditNote.linkedCreditNote);

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
    const creditNote = await CreditNote.findOne({ _id: req.params._id })
      .populate({
        path: 'customer',
        select: '_id identity contact subscriptions',
        populate: {
          path: 'subscriptions.service',
          match: { company: get(req, 'auth.credentials.company._id', null) },
        },
      })
      .populate({
        path: 'thirdPartyPayer',
        select: '_id name address',
        match: { company: get(req, 'auth.credentials.company._id', null) },
      })
      .populate({ path: 'events.auxiliary', select: 'identity' })
      .lean();

    if (!creditNote) return Boom.notFound(translate[language].creditNoteNotFound);
    if (creditNote.origin !== COMPANI) return Boom.badRequest(translate[language].creditNoteNotCompani);

    const company = await Company.findOne();
    const data = formatPDF(creditNote, company);
    const pdf = await generatePdf(data, './src/data/creditNote.html');

    return h.response(pdf)
      .header('content-disposition', `inline; filename=${creditNote.number}.pdf`)
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
