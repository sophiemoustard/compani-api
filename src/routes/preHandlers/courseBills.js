const Boom = require('@hapi/boom');
const Company = require('../../models/Company');
const Course = require('../../models/Course');
const CourseFundingOrganisation = require('../../models/CourseFundingOrganisation');

exports.authorizeCourseBillCreation = async (req) => {
  const { course, company, courseFundingOrganisation } = req.payload;
  const companyExists = await Company.countDocuments({ _id: company });
  if (!companyExists) throw Boom.notFound();

  const courseExists = await Course.countDocuments({ _id: course, company });
  if (!courseExists) throw Boom.notFound();

  if (courseFundingOrganisation) {
    const courseFundingOrganisationExists = await CourseFundingOrganisation
      .countDocuments({ _id: courseFundingOrganisation });
    if (!courseFundingOrganisationExists) throw Boom.notFound();
  }

  return null;
};

exports.authorizeCourseBillGet = async (req) => {
  const { course } = req.query;
  const courseExists = await Course.countDocuments({ _id: course });
  if (!courseExists) throw Boom.notFound();

  return null;
};
