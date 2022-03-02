const Boom = require('@hapi/boom');
const Company = require('../../models/Company');
const Course = require('../../models/Course');
const CourseBill = require('../../models/CourseBill');
const CourseBillingItem = require('../../models/CourseBillingItem');
const CourseFundingOrganisation = require('../../models/CourseFundingOrganisation');
const UtilsHelper = require('../../helpers/utils');

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

exports.authorizeCourseBillUpdate = async (req) => {
  const courseBill = await CourseBill.countDocuments({ _id: req.params._id });
  if (!courseBill) throw Boom.notFound();

  if (req.payload.courseFundingOrganisation) {
    const courseFundingOrganisationExists = await CourseFundingOrganisation
      .countDocuments({ _id: req.payload.courseFundingOrganisation });
    if (!courseFundingOrganisationExists) throw Boom.notFound();
  }

  return null;
};

exports.authorizeCourseBillingItemAddition = async (req) => {
  const { billingItem } = req.payload;
  const billingItemExists = await CourseBillingItem.countDocuments({ _id: billingItem });
  if (!billingItemExists) throw Boom.notFound();

  const courseBill = await CourseBill.findOne({ _id: req.params._id }).lean();
  if (!courseBill) throw Boom.notFound();

  if (courseBill.billingItemList.find(item => UtilsHelper.areObjectIdsEquals(item.billingItem, billingItem))) {
    throw Boom.conflict();
  }

  return null;
};
