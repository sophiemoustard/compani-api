const Boom = require('boom');
const Event = require('../../models/Event');
const translate = require('../../helpers/translate');
const { authorize } = require('../../helpers/authentification');

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

exports.authorizeEventUpdate = scopes => async (req) => {
  const { credentials } = req.auth;
  const { event } = req.pre;

  const routeScopes = [].concat(scopes, `events.auxiliary:${credentials._id}:edit`);
  credentials.scope = [].concat(credentials.scope, `events.auxiliary:${event.auxiliary}:edit`);

  const isAuthorized = authorize(routeScopes, credentials.scope);
  if (!isAuthorized) return Boom.forbidden();

  return event;
};

