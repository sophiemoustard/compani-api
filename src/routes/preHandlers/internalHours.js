const Boom = require('@hapi/boom');
const InternalHour = require('../../models/InternalHour');
const translate = require('../../helpers/translate');
const { MAX_INTERNAL_HOURS_NUMBER } = require('../../helpers/constants');

const { language } = translate;

exports.getInternalHour = async (req) => {
  try {
    const internalHourId = req.params._id;
    const internalHour = await InternalHour.findById(internalHourId).lean();
    if (!internalHour) throw Boom.notFound(translate[language].companyInternalHourNotFound);

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
  if (internalHour.company.toHexString() === credentials.company._id.toHexString()) return null;

  throw Boom.forbidden();
};
