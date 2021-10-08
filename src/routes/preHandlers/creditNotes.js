const Boom = require('@hapi/boom');
const get = require('lodash/get');
const BillingItem = require('../../models/BillingItem');
const CreditNote = require('../../models/CreditNote');
const Customer = require('../../models/Customer');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const Event = require('../../models/Event');
const translate = require('../../helpers/translate');
const { COMPANI } = require('../../helpers/constants');

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

exports.authorizeCreditNoteCreation = async req => exports.authorizeCreditNoteCreationOrUpdate(req);

exports.authorizeCreditNoteUpdate = async (req) => {
  const { creditNote } = req.pre;
  if (!creditNote.isEditable) throw Boom.forbidden();

  return exports.authorizeCreditNoteCreationOrUpdate(req);
};

exports.authorizeCreditNoteCreationOrUpdate = async (req) => {
  const { credentials } = req.auth;
  const { creditNote } = req.pre;
  const { payload } = req;
  const companyId = get(credentials, 'company._id', null);

  if (!credentials.scope.includes('bills:edit')) throw Boom.forbidden();

  if (creditNote && creditNote.origin !== COMPANI) throw Boom.forbidden(translate[language].creditNoteNotCompani);

  const query = {
    _id: payload.customer || creditNote.customer,
    ...(payload.subscription && { 'subscriptions._id': payload.subscription._id }),
    archivedAt: { $eq: null },
    company: companyId,
  };
  const customerCount = await Customer.countDocuments(query);
  if (!customerCount) throw Boom.notFound();

  if (payload.thirdPartyPayer) {
    const tppCount = await ThirdPartyPayer.countDocuments({ _id: payload.thirdPartyPayer, company: companyId });
    if (!tppCount) throw Boom.notFound();
  }

  if (get(payload, 'events.length')) {
    const eventsIds = payload.events.map(ev => ev.eventId);
    const eventsCount = await Event.countDocuments({ _id: { $in: eventsIds }, company: companyId });
    if (eventsCount !== eventsIds.length) throw Boom.notFound();

    for (const event of payload.events) {
      if (!get(event, 'bills.billingItems.length')) continue;
      const billingItemsIds = event.bills.billingItems.map(bi => bi.billingItem);
      const billingItemsCount = await BillingItem.countDocuments({ _id: { $in: billingItemsIds }, company: companyId });
      if (billingItemsCount !== billingItemsIds.length) throw Boom.notFound();
    }
  }

  return null;
};

exports.authorizeCreditNoteDeletion = async (req) => {
  const { creditNote } = req.pre;

  if (creditNote.origin !== COMPANI || !creditNote.isEditable) {
    throw Boom.forbidden(translate[language].creditNoteNotCompani);
  }

  const customerCount = await Customer.countDocuments({ _id: creditNote.customer, archivedAt: { $eq: null } });
  if (!customerCount) throw Boom.notFound();

  return null;
};
