const Boom = require('@hapi/boom');
const Service = require('../../models/Service');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeServicesUpdate = async (req) => {
  if (!req.auth.credentials.company || !req.auth.credentials.company._id) throw Boom.forbidden();
  const companyId = req.auth.credentials.company._id;
  const service = await Service.findOne({ _id: req.params._id }).lean();

  if (!service) throw Boom.notFound(translate[language].serviceNotFound);
  if (service.isArchived) throw Boom.forbidden();
  if (service.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();

  return null;
};
