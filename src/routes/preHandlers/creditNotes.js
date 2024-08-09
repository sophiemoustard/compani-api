const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CreditNote = require('../../models/CreditNote');
const Customer = require('../../models/Customer');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getCreditNote = async (req) => {
  try {
    const creditNote = await CreditNote
      .findOne({ _id: req.params._id, company: get(req, 'auth.credentials.company._id') })
      .lean();
    if (!creditNote) throw Boom.notFound(translate[language].creditNoteNotFound);

    return creditNote;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeGetCreditNotePdf = async (req) => {
  const { credentials } = req.auth;
  const { creditNote } = req.pre;

  const canRead = credentials.scope.includes('bills:read');
  const isHelpersCustomer = credentials.scope.includes(`customer-${creditNote.customer.toHexString()}`);
  if (!canRead && !isHelpersCustomer) throw Boom.forbidden();

  const customer = await Customer.countDocuments({ _id: creditNote.customer, company: credentials.company._id });
  if (!customer) throw Boom.notFound();

  return null;
};
