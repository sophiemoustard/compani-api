const Boom = require('boom');
const flat = require('flat');
const moment = require('moment');

const CreditNote = require('../models/CreditNote');
const CreditNoteNumber = require('../models/CreditNoteNumber');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    req.query.date = { $gte: req.query.startDate, $lte: req.query.endDate };
    delete req.query.startDate;
    delete req.query.endDate;
    const creditNotes = await CreditNote.find(req.query)
      .populate({ path: 'customer', select: '_id identity' })
      .populate('events');

    return {
      message: creditNotes.length === 0 ? translate[language].creditNotesNotFound : translate[language].creditNotesFound,
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
      .populate({ path: 'customer', select: '_id identity' })
      .populate('events');
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
    const query = { creditNoteNumber: { prefix: `AV${moment().format('YYMMDD')}` } };
    const payload = { creditNoteNumber: { seq: 1 } };
    const number = await CreditNoteNumber.findOneAndUpdate(
      flat(query),
      { $inc: flat(payload) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const creditNoteNumber = `${number.creditNoteNumber.prefix}-${number.creditNoteNumber.seq.toString().padStart(3, '0')}`;
    req.payload.number = creditNoteNumber;
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
  getById,
};
