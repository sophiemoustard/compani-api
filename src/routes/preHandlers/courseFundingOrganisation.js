const Boom = require('@hapi/boom');
const CourseFundingOrganisation = require('../../models/CourseFundingOrganisation');

exports.authorizeCourseFundingOrganisationCreate = async (req) => {
  const { name } = req.payload;
  const nameAlreadyExists = await CourseFundingOrganisation.countDocuments({ name }, { limit: 1 });
  if (nameAlreadyExists) throw Boom.conflict();

  return null;
};
