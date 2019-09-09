const Boom = require('boom');
const Event = require('../../models/Event');
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

exports.authorizeOwnEventUpdate = async (req) => {
  const { credentials } = req.auth;
  const { event } = req.pre;

  if (credentials.scope.includes('events:edit') ||
    (!credentials.scope.includes('events:edit') &&
      credentials.scope.includes('events:own:edit') &&
      event.auxiliary === credentials._id)) return event;

  throw Boom.forbidden();
};
