const Boom = require('boom');
const get = require('lodash/get');
const Event = require('../../models/Event');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const InternalHour = require('../../models/InternalHour');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getEvent = async (req) => {
  try {
    const event = await Event.findById(req.params._id).lean();
    if (!event) throw Boom.notFound(translate[language].eventNotFound);

    return event;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeEventDeletion = async (req) => {
  const { credentials } = req.auth;
  const event = req.pre.event || req.payload;

  const canEditEvent = credentials.scope.includes('events:edit');
  const isOwnEvent = credentials.scope.includes('events:own:edit') && event.auxiliary === credentials._id;
  if (!canEditEvent && !isOwnEvent) throw Boom.forbidden();

  return null;
};

exports.authorizeEventCreationOrUpdate = async (req) => {
  const { credentials } = req.auth;
  const event = req.pre.event || req.payload;

  const canEditEvent = credentials.scope.includes('events:edit');
  const isOwnEvent = credentials.scope.includes('events:own:edit') && event.auxiliary === credentials._id;
  if (!canEditEvent && !isOwnEvent) throw Boom.forbidden();

  if (req.payload.customer || (event.customer && req.payload.subscription)) {
    const customerId = req.payload.customer || event.customer;
    const customer = await Customer.findOne(({ _id: customerId, company: get(credentials, 'company._id', null) }));
    if (!customer) throw Boom.forbidden();
    const subscriptionsIds = customer.subscriptions.map(subscription => subscription._id);
    if (!(subscriptionsIds.includes(req.payload.subscription))) throw Boom.forbidden();
  }

  if (req.payload.auxiliary) {
    const auxiliary = await User.findOne(({ _id: req.payload.auxiliary, company: get(credentials, 'company._id', null) }));
    if (!auxiliary) throw Boom.forbidden();
  }

  if (req.payload.internalHour) {
    const internalHour = await InternalHour.findOne(({ _id: req.payload.internalHour, company: get(credentials, 'company._id', null) }));
    if (!internalHour) throw Boom.forbidden();
  }

  return null;
};
