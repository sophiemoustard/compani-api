const Boom = require('@hapi/boom');
const PartnerOrganization = require('../../models/PartnerOrganization');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.checkPartnerOrganizationExists = async (req) => {
  const { credentials } = req.auth;

  const partnerOrganizationExists = await PartnerOrganization.countDocuments({
    _id: req.params._id,
    company: credentials.company._id,
  });
  if (!partnerOrganizationExists) throw Boom.notFound();

  return null;
};

exports.authorizePartnerOrganizationCreation = async (req) => {
  const { credentials } = req.auth;

  const nameAlreadyExists = await PartnerOrganization
    .countDocuments({ name: req.payload.name, company: credentials.company._id }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].partnerOrganizationAlreadyExists);

  return null;
};

exports.authorizePartnerOrganizationGetById = async (req) => {
  await this.checkPartnerOrganizationExists(req);

  return null;
};

exports.authorizePartnerOrganizationUpdate = async (req) => {
  await this.checkPartnerOrganizationExists(req);

  if (req.payload.name) {
    const { credentials } = req.auth;
    const nameAlreadyExists = await PartnerOrganization
      .countDocuments({
        _id: { $ne: req.params._id },
        name: req.payload.name,
        company: credentials.company._id,
      }, { limit: 1 })
      .collation({ locale: 'fr', strength: 1 });
    if (nameAlreadyExists) throw Boom.conflict(translate[language].partnerOrganizationAlreadyExists);
  }

  return null;
};

exports.authorizePartnerCreation = async (req) => {
  await this.checkPartnerOrganizationExists(req);

  return null;
};
