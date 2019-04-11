const Boom = require('boom');
const flat = require('flat');
const moment = require('moment');

const CreditNote = require('../models/CreditNote');
const CreditNoteNumber = require('../models/CreditNoteNumber');
const translate = require('../helpers/translate');
const { updateEventBillingStatus } = require('../helpers/creditNotes');

const { language } = translate;

const list = async (req) => {
  try {
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
    const query = { prefix: `AV-${moment().format('YYMM')}` };
    const numberPayload = { seq: 1 };
    const number = await CreditNoteNumber.findOneAndUpdate(
      flat(query),
      { $inc: flat(numberPayload) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const creditNoteNumber = `${number.prefix}${number.seq.toString().padStart(3, '0')}`;
    req.payload.number = creditNoteNumber;
    const creditNote = new CreditNote(req.payload);
    await creditNote.save();

    if (req.payload.events) await updateEventBillingStatus(req.payload.events, false);

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
    let creditNote = await CreditNote.findByIdAndUpdate(req.params._id);
    if (!creditNote) return Boom.notFound(translate[language].creditNoteNotFound);

    if (creditNote.events) await updateEventBillingStatus(creditNote.events, true);

    creditNote = await CreditNote.findByIdAndUpdate(req.params._id, { $set: req.payload }, { new: true });

    if (req.payload.events) await updateEventBillingStatus(req.payload.events, false);

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
    const creditNote = await CreditNote.findByIdAndUpdate(req.params._id);
    if (!creditNote) return Boom.notFound(translate[language].creditNoteNotFound);

    await updateEventBillingStatus(creditNote.events, true);
    await CreditNote.findByIdAndRemove(req.params._id);

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
