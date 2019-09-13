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

exports.authorizeEventUpdate = async (req) => {
  const { credentials } = req.auth;
  const event = req.pre.event || req.payload;

  if (credentials.scope.includes('events:edit')) return null;
  if (credentials.scope.includes('events:sector:edit') && event.sector == credentials.sector) return null;
  if (credentials.scope.includes('events:own:edit') && event.auxiliary == credentials._id) return null;

  throw Boom.forbidden();
};
