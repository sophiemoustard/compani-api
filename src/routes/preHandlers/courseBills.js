const Boom = require('@hapi/boom');
const { get, has, omit } = require('lodash');
const Company = require('../../models/Company');
const Course = require('../../models/Course');
const CourseBill = require('../../models/CourseBill');
const CourseBillingItem = require('../../models/CourseBillingItem');
const CourseFundingOrganisation = require('../../models/CourseFundingOrganisation');
const UtilsHelper = require('../../helpers/utils');
const translate = require('../../helpers/translate');

const { language } = translate;

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
  const { course, company } = req.query;

  if (course) {
    const courseExists = await Course.countDocuments({ _id: course });
    if (!courseExists) throw Boom.notFound();
  }

  if (company) {
    const companyExists = await Company.countDocuments({ _id: company });
    if (!companyExists) throw Boom.notFound();
  }
  return null;
};

exports.authorizeCourseBillUpdate = async (req) => {
  const courseBill = await CourseBill
    .findOne({ _id: req.params._id })
    .populate({ path: 'company', select: 'address' })
    .lean();
  if (!courseBill) throw Boom.notFound();

  if (req.payload.courseFundingOrganisation) {
    const courseFundingOrganisationExists = await CourseFundingOrganisation
      .countDocuments({ _id: req.payload.courseFundingOrganisation });
    if (!courseFundingOrganisationExists) throw Boom.notFound();
  }

  if (req.payload.billedAt) {
    if (courseBill.billedAt) throw Boom.forbidden();
    if (!get(courseBill, 'courseFundingOrganisation') && !get(courseBill, 'company.address')) {
      throw Boom.forbidden(translate[language].courseCompanyAddressMissing);
    }
  }

  if (courseBill.billedAt) {
    if (has(req.payload, 'courseFundingOrganisation')) {
      const payloadCourseFundingOrga = req.payload.courseFundingOrganisation;
      const courseBillCourseFundingOrga = courseBill.courseFundingOrganisation;
      const isCourseFundingOrganisationEqual = (!payloadCourseFundingOrga && !courseBillCourseFundingOrga) ||
        UtilsHelper.areObjectIdsEquals(payloadCourseFundingOrga, courseBillCourseFundingOrga);

      if (!isCourseFundingOrganisationEqual) throw Boom.forbidden();
    }

    const payloadKeys = UtilsHelper
      .getKeysOf2DepthObject(omit(req.payload, ['courseFundingOrganisation', 'mainFee.description']));
    const areFieldsChanged = payloadKeys.some(key => get(req.payload, key) !== get(courseBill, key));
    if (areFieldsChanged) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeCourseBillingPurchaseAddition = async (req) => {
  const { billingItem } = req.payload;
  const billingItemExists = await CourseBillingItem.countDocuments({ _id: billingItem });
  if (!billingItemExists) throw Boom.notFound();

  const courseBill = await CourseBill.findOne({ _id: req.params._id }).lean();
  if (!courseBill) throw Boom.notFound();

  if (courseBill.billingPurchaseList.find(p => UtilsHelper.areObjectIdsEquals(p.billingItem, billingItem))) {
    throw Boom.conflict(translate[language].courseBillingItemAlreadyAdded);
  }

  if (courseBill.billedAt) throw Boom.forbidden();

  return null;
};

exports.authorizeCourseBillingPurchaseUpdate = async (req) => {
  const { _id: courseBillId, billingPurchaseId } = req.params;

  const courseBillRelatedToPurchase = await CourseBill
    .findOne({ _id: courseBillId, 'billingPurchaseList._id': billingPurchaseId })
    .lean();
  if (!courseBillRelatedToPurchase) throw Boom.notFound();

  if (courseBillRelatedToPurchase.billedAt) {
    const payloadKeys = Object.keys(omit(req.payload, 'description'));
    const purchase = courseBillRelatedToPurchase.billingPurchaseList
      .find(p => UtilsHelper.areObjectIdsEquals(p._id, billingPurchaseId));

    const areFieldsChanged = payloadKeys.some(key => get(req.payload, key) !== get(purchase, key));
    if (areFieldsChanged) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeCourseBillingPurchaseDelete = async (req) => {
  const { _id: courseBillId, billingPurchaseId } = req.params;

  const courseBill = await CourseBill.findOne({ _id: courseBillId }).lean();
  if (!courseBill) throw Boom.notFound();

  if (courseBill.billedAt) throw Boom.forbidden();

  const purchaseRelatedToBill = courseBill.billingPurchaseList
    .some(p => UtilsHelper.areObjectIdsEquals(p._id, billingPurchaseId));
  if (!purchaseRelatedToBill) throw Boom.notFound();

  return null;
};

exports.authorizeBillPdfGet = async (req) => {
  const isBillValidated = await CourseBill
    .countDocuments({ _id: req.params._id, billedAt: { $exists: true, $type: 'date' } });
  if (!isBillValidated) throw Boom.notFound();

  return null;
};
