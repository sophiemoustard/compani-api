const Boom = require('@hapi/boom');
const PartnerOrganization = require('../../models/PartnerOrganization');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizePartnerOrganizationCreation = async (req) => {
  const partnerOrganizationAlreadyExist = await PartnerOrganization.countDocuments({ name: req.payload.name });
  if (partnerOrganizationAlreadyExist) throw Boom.conflict(translate[language].partnerOrganizationAlreadyExists);

  return null;
};
