const Boom = require('boom');
const get = require('lodash/get');
const CreditNote = require('../../models/CreditNote');
const Customer = require('../../models/Customer');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const Event = require('../../models/Event');
const translate = require('../../helpers/translate');
const { COMPANI } = require('../../helpers/constants');

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

  const canRead = credentials.scope.includes('bills:read');
  const isHelpersCustomer = credentials.scope.includes(`customer-${creditNote.customer.toHexString()}`);

  const customer = await Customer.findOne({ _id: creditNote.customer, company: credentials.company._id }).lean();
  if (!customer) throw Boom.forbidden();
  if (!canRead && !isHelpersCustomer) throw Boom.forbidden();

  return null;
};


exports.authorizeCreditNoteCreationOrUpdate = async (req) => {
  const { credentials } = req.auth;
  const { creditNote } = req.pre;
  const { payload } = req;
  const companyId = get(credentials, 'company._id', null);

  if (!credentials.scope.includes('bills:edit')) throw Boom.forbidden();
  if (creditNote && creditNote.origin !== COMPANI) {
    throw Boom.forbidden(translate[language].creditNoteNotCompani);
  }

  if (payload.customer) {
    const customer = await Customer.findOne(({ _id: payload.customer, company: companyId })).lean();
    if (!customer) throw Boom.forbidden();
  }

  if (payload.subscription) {
    const customer = await Customer.findOne({
      'subscriptions._id': payload.subscription._id,
      company: companyId,
    }).lean();
    if (!customer) throw Boom.forbidden();
  }

  if (payload.thirdPartyPayer) {
    const tpp = await ThirdPartyPayer.findOne(({ _id: payload.thirdPartyPayer, company: companyId })).lean();
    if (!tpp) throw Boom.forbidden();
  }

  if (payload.events && payload.events.length) {
    const eventsIds = payload.events.map(ev => ev.eventId);
    const eventsCount = await Event.countDocuments({ _id: { $in: eventsIds }, company: companyId });
    if (eventsCount !== eventsIds.length) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeCreditNoteDeletion = async (req) => {
  const { credentials } = req.auth;
  const { creditNote } = req.pre;

  if (creditNote.company.toHexString() === credentials.company._id.toHexString()) return null;

  if (creditNote && creditNote.origin !== COMPANI) {
    throw Boom.forbidden(translate[language].creditNoteNotCompani);
  }
  throw Boom.forbidden();
};
