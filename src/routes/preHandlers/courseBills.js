const Boom = require('@hapi/boom');
const { get, omit } = require('lodash');
const Company = require('../../models/Company');
const Course = require('../../models/Course');
const CourseBill = require('../../models/CourseBill');
const CourseBillingItem = require('../../models/CourseBillingItem');
const CourseFundingOrganisation = require('../../models/CourseFundingOrganisation');
const UtilsHelper = require('../../helpers/utils');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeCourseBillCreation = async (req) => {
  const { course, company: companyId, payer } = req.payload;
  const companyExists = await Company.countDocuments({ _id: companyId }, { limit: 1 });
  if (!companyExists) throw Boom.notFound();

  const courseExists = await Course.countDocuments({ _id: course, company: companyId }, { limit: 1 });
  if (!courseExists) throw Boom.notFound();

  if (payer) {
    if (payer.fundingOrganisation) {
      const fundingOrganisation = await CourseFundingOrganisation
        .countDocuments({ _id: payer.fundingOrganisation }, { limit: 1 });
      if (!fundingOrganisation) throw Boom.notFound();
    } else {
      const company = await Company.countDocuments({ _id: payer.company }, { limit: 1 });
      if (!company) throw Boom.notFound();
    }
  }

  return null;
};

exports.authorizeCourseBillGet = async (req) => {
  const { course, company } = req.query;

  if (course) {
    const courseExists = await Course.countDocuments({ _id: course }, { limit: 1 });
    if (!courseExists) throw Boom.notFound();
  }

  if (company) {
    const companyExists = await Company.countDocuments({ _id: company }, { limit: 1 });
    if (!companyExists) throw Boom.notFound();
  }
  return null;
};

exports.authorizeCourseBillUpdate = async (req) => {
  const courseBill = await CourseBill
    .findOne({ _id: req.params._id })
    .populate({ path: 'payer.company', select: 'address' })
    .populate({ path: 'payer.fundingOrganisation', select: 'address' })
    .lean();
  if (!courseBill) throw Boom.notFound();
  if (req.payload.payer) {
    if (req.payload.payer.fundingOrganisation) {
      const courseFundingOrganisationExists = await CourseFundingOrganisation
        .countDocuments({ _id: req.payload.payer.fundingOrganisation }, { limit: 1 });

      if (!courseFundingOrganisationExists) throw Boom.notFound();
    } else {
      const companyExists = await Company.countDocuments({ _id: req.payload.payer.company }, { limit: 1 });
      if (!companyExists) throw Boom.notFound();
    }
  }

  if (req.payload.billedAt) {
    if (courseBill.billedAt) throw Boom.forbidden();
    if (!get(courseBill, 'payer.address')) {
      throw Boom.forbidden(translate[language].courseCompanyAddressMissing);
    }
  }

  if (courseBill.billedAt) {
    const payloadKeys = UtilsHelper
      .getKeysOf2DepthObject(omit(req.payload, ['mainFee.description']));
    const areFieldsChanged = payloadKeys.some(key => get(req.payload, key) !== get(courseBill, key));
    if (areFieldsChanged) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeCourseBillingPurchaseAddition = async (req) => {
  const { billingItem } = req.payload;
  const billingItemExists = await CourseBillingItem.countDocuments({ _id: billingItem }, { limit: 1 });
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
    .countDocuments({ _id: req.params._id, billedAt: { $exists: true, $type: 'date' } }, { limit: 1 });
  if (!isBillValidated) throw Boom.notFound();

  return null;
};
