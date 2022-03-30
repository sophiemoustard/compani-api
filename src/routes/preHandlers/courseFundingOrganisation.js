const Boom = require('@hapi/boom');
const has = require('lodash/has');
const CourseFundingOrganisation = require('../../models/CourseFundingOrganisation');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeCourseFundingOrganisationCreation = async (req) => {
  const { name } = req.payload;
  const nameAlreadyExists = await CourseFundingOrganisation
    .countDocuments({ name }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].courseFundingOrganisationExists);

  return null;
};

exports.authorizeCourseFundingOrganisationDeletion = async (req) => {
  const { credentials } = req.auth;

  const organisation = await CourseFundingOrganisation
    .findOne(req.params)
    .populate({ path: 'courseBillCount', options: { isVendorUser: has(credentials, 'role.vendor') } })
    .lean();

  if (!organisation) throw Boom.notFound();

  if (organisation.courseBillCount) throw Boom.forbidden();

  return null;
};
