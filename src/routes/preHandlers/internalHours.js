const Boom = require('@hapi/boom');
const InternalHour = require('../../models/InternalHour');
const Event = require('../../models/Event');
const translate = require('../../helpers/translate');
const { MAX_INTERNAL_HOURS_NUMBER } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');

const { language } = translate;

exports.getInternalHour = async (req) => {
  try {
    const { credentials } = req.auth;
    const internalHour = await InternalHour.findOne({ _id: req.params._id }).lean();
    if (!internalHour) throw Boom.notFound(translate[language].companyInternalHourNotFound);
    if (!UtilsHelper.areObjectIdsEquals(internalHour.company, credentials.company._id)) return Boom.forbidden();

    return internalHour;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeInternalHourCreation = async (req) => {
  const companyId = req.auth.credentials.company._id;
  const companyInternalHoursCount = await InternalHour.countDocuments({ company: companyId });

  if (companyInternalHoursCount >= MAX_INTERNAL_HOURS_NUMBER) {
    throw Boom.forbidden(translate[language].companyInternalHourCreationNotAllowed);
  }

  return null;
};

exports.authorizeInternalHourUpdate = (req) => {
  const { credentials } = req.auth;
  const internalHour = req.pre.internalHour || req.payload;
  if (!UtilsHelper.areObjectIdsEquals(internalHour.company, credentials.company._id)) return Boom.forbidden();

  return null;
};

exports.authorizeInternalHourDeletion = async (req) => {
  const eventCounts = await Event.countDocuments({ internalHour: req.pre.internalHour._id });
  if (eventCounts) return Boom.forbidden();

  return null;
};
