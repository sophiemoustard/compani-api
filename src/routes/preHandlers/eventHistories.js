const Boom = require('@hapi/boom');
const get = require('lodash/get');
const UtilsHelper = require('../../helpers/utils');
const Event = require('../../models/Event');
const EventHistory = require('../../models/EventHistory');
const UserCompany = require('../../models/UserCompany');
const Sector = require('../../models/Sector');

exports.authorizeEventsHistoriesGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (!req.query.auxiliaries && !req.query.sectors) return null;

  if (req.query.auxiliaries) {
    const auxiliariesIds = UtilsHelper.formatIdsArray(req.query.auxiliaries);
    const auxiliariesCount = await UserCompany.countDocuments({ user: { $in: auxiliariesIds }, company: companyId });
    if (auxiliariesCount !== auxiliariesIds.length) throw Boom.notFound();
  }

  if (req.query.sectors) {
    const sectorsIds = UtilsHelper.formatIdsArray(req.query.sectors);
    const sectorCount = await Sector.countDocuments({ _id: { $in: sectorsIds }, company: companyId });
    if (sectorCount !== sectorsIds.length) throw Boom.notFound();
  }

  return null;
};

exports.authorizeEventHistoryCancellation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);

  const eventHistory = await EventHistory
    .findOne({
      _id: req.params._id,
      action: { $in: EventHistory.TIME_STAMPING_ACTIONS },
      isCancelled: false,
      company: companyId,
    })
    .lean();
  if (!eventHistory) throw Boom.notFound();

  const isEventBilled = await Event.countDocuments({
    _id: eventHistory.event.eventId,
    isBilled: true,
    company: companyId,
  });
  if (isEventBilled) throw Boom.forbidden();

  return null;
};
