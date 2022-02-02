const Boom = require('@hapi/boom');
const CourseFundingOrganisation = require('../../models/CourseFundingOrganisation');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeCourseFundingOrganisationCreate = async (req) => {
  const { name } = req.payload;
  const nameAlreadyExists = await CourseFundingOrganisation.countDocuments({ name }, { limit: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].courseFundingOrganisationExists);

  return null;
};

exports.authorizeCourseFundingOrganisationDelete = async (req) => {
  const organisationExists = await CourseFundingOrganisation.countDocuments(req.params);
  if (!organisationExists) throw Boom.notFound();

  return null;
};
