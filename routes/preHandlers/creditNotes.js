const Boom = require('boom');
const CreditNote = require('../../models/CreditNote');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getCreditNote = async (req) => {
  try {
    const creditNote = await CreditNote.findOne({ _id: req.params._id }).lean();
    if (!creditNote) throw Boom.notFound(translate[language].eventNotFound);

    return creditNote;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCreditNoteReading = async (req) => {
  const { credentials } = req.auth;
  const { creditNote } = req.pre;

  if (credentials.scope.includes('creditNotes:read')) return null;
  if (credentials.scope.includes(`customer-${creditNote.customer.toHexString()}`)) return null;

  throw Boom.forbidden();
};
