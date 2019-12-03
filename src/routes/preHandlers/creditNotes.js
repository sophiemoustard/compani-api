const Boom = require('boom');
const get = require('lodash/get');
const CreditNote = require('../../models/CreditNote');
const Customer = require('../../models/Customer');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const Event = require('../../models/Event');
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

  if (credentials.scope.includes('bills:read')) return null;
  if (credentials.scope.includes(`customer-${creditNote.customer.toHexString()}`)) return null;

  throw Boom.forbidden();
};

exports.authorizeCreditNoteCreationOrUpdate = async (req) => {
  const { credentials } = req.auth;
  const creditNote = req.pre.creditNote || req.payload;
  const companyId = get(credentials, 'company._id', null);

  if (!credentials.scope.includes('bills:edit')) throw Boom.forbidden();

  if (creditNote.customer) {
    const customer = await Customer.findOne(({ _id: creditNote.customer, company: companyId })).lean();
    if (!customer) throw Boom.forbidden();
    const subscriptionsIds = customer.subscriptions.map(subscription => subscription._id.toHexString());
    if (!(subscriptionsIds.includes(creditNote.subscription._id))) throw Boom.forbidden();
  }

  if (creditNote.thirdPartyPayer) {
    const tpp = await ThirdPartyPayer.findOne(({ _id: creditNote.thirdPartyPayer, company: companyId })).lean();
    if (!tpp) throw Boom.forbidden();
  }

  if (creditNote.events && creditNote.events.length) {
    const eventsIds = creditNote.events.map(ev => ev.eventId);
    const eventsCheckCount = await Event.countDocuments({ _id: { $in: eventsIds }, company: companyId });
    if (eventsCheckCount !== eventsIds.length) throw Boom.forbidden();
  }

  return null;
};
