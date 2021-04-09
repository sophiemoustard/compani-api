const Boom = require('@hapi/boom');
const PartnerOrganization = require('../../models/PartnerOrganization');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.checkPartnerOrganizationAlreadyExists = async (req) => {
  const { credentials } = req.auth;

  const partnerOrganizationAlreadyExist = await PartnerOrganization.countDocuments({
    name: req.payload.name,
    company: credentials.company._id,
  });
  if (partnerOrganizationAlreadyExist) throw Boom.conflict(translate[language].partnerOrganizationAlreadyExists);

  return null;
};

exports.checkPartnerOrganizationExists = async (req) => {
  const partnerOrganizationExists = await PartnerOrganization.countDocuments({ _id: req.params._id });
  if (!partnerOrganizationExists) throw Boom.notFound();

  return null;
};

exports.authorizePartnerOrganizationCreation = async (req) => {
  await this.checkPartnerOrganizationAlreadyExists(req);

  return null;
};

exports.authorizePartnerOrganizationGetById = async (req) => {
  await this.checkPartnerOrganizationExists(req);

  return null;
};

exports.authorizePartnerOrganizationUpdate = async (req) => {
  await this.checkPartnerOrganizationExists(req);

  if (req.payload.name) await this.checkPartnerOrganizationAlreadyExists(req);

  return null;
};
