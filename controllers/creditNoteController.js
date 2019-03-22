const Boom = require('boom');

const CreditNote = require('../models/Surcharge');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const creditNotes = await CreditNote.find(req.query)
      .populate('customer')
      .populate('thirdPartyPayer')
      .populate('events')
    if (creditNotes.length === 0) return Boom.notFound(translate[language].surchargeNotFound);
    return {
      message: creditNotes.length === 0 ? translate[language].surchargesNotFound : translate[language].surchargesFound,
      data: { creditNotes },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getById = async (req) => {
  try {
    const creditNote = await CreditNote.findById(req.params._id)
      .populate('customer')
      .populate('thirdPartyPayer')
      .populate('events')
    if (!creditNote) return Boom.notFound(translate[language].creditNoteNotFound);
    return {
      message: translate[language].creditNoteFound,
      data: { creditNote }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const creditNote = new CreditNote(req.payload);
    await creditNote.save();

    return {
      message: translate[language].creditNoteCreated,
      data: { creditNote },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {
  try {
    const creditNote = await CreditNote.findByIdAndUpdate(req.params._id, { $set: req.payload }, { new: true });
    if (!creditNote) return Boom.notFound(translate[language].creditNoteNotFound);
    return {
      message: translate[language].creditNoteUpdated,
      data: { creditNote },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const creditNote = await CreditNote.findByIdAndRemove(req.params._id);
    if (!creditNote) return Boom.notFound(translate[language].creditNoteNotFound);

    return {
      message: translate[language].creditNoteDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
  getById
};
