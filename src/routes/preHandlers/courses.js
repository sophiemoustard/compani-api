const Boom = require('@hapi/boom');
const get = require('lodash/get');
const has = require('lodash/has');
const pick = require('lodash/pick');
const Course = require('../../models/Course');
const User = require('../../models/User');
const UserCompany = require('../../models/UserCompany');
const CourseSlot = require('../../models/CourseSlot');
const Company = require('../../models/Company');
const CourseBill = require('../../models/CourseBill');
const {
  TRAINER,
  INTRA,
  INTER_B2B,
  VENDOR_ADMIN,
  CLIENT_ADMIN,
  COACH,
  TRAINING_ORGANISATION_MANAGER,
  STRICTLY_E_LEARNING,
  BLENDED,
  ON_SITE,
  MOBILE,
  OTHER,
  OPERATIONS,
  CONVOCATION,
} = require('../../helpers/constants');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const { CompaniDate } = require('../../helpers/dates/companiDates');

const { language } = translate;

exports.checkAuthorization = (credentials, courseTrainerId, companies) => {
  const userVendorRole = get(credentials, 'role.vendor.name');
  const userClientRole = get(credentials, 'role.client.name');
  const userCompanyId = credentials.company ? credentials.company._id.toHexString() : null;
  const userId = get(credentials, '_id');
  const areCompaniesMatching = UtilsHelper.doesArrayIncludeId(companies, userCompanyId);

  const isAdminVendor = userVendorRole === VENDOR_ADMIN;
  const isTOM = userVendorRole === TRAINING_ORGANISATION_MANAGER;
  const isTrainerAndAuthorized = userVendorRole === TRAINER && UtilsHelper.areObjectIdsEquals(userId, courseTrainerId);
  const isClientAndAuthorized = [CLIENT_ADMIN, COACH].includes(userClientRole) && userCompanyId && areCompaniesMatching;

  if (!isAdminVendor && !isTOM && !isTrainerAndAuthorized && !isClientAndAuthorized) throw Boom.forbidden();
};

exports.checkSalesRepresentativeExists = async (req) => {
  const salesRepresentative = await User.findOne({ _id: req.payload.salesRepresentative }, { role: 1 })
    .lean({ autopopulate: true });

  if (![VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(get(salesRepresentative, 'role.vendor.name'))) {
    throw Boom.forbidden();
  }

  return null;
};

exports.authorizeCourseCreation = async (req) => {
  await this.checkSalesRepresentativeExists(req);

  if (get(req, 'payload.company')) {
    const { company } = req.payload;

    const companyExists = await Company.countDocuments({ _id: company });
    if (!companyExists) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeGetDocumentsAndSms = async (req) => {
  const { credentials } = req.auth;

  const course = await Course
    .findOne({ _id: req.params._id }, { trainees: 1, type: 1, companies: 1, trainer: 1 })
    .populate({ path: 'trainees', select: '_id company', populate: { path: 'company' } })
    .lean();
  if (!course) throw Boom.notFound();

  const isTrainee = UtilsHelper.doesArrayIncludeId(course.trainees.map(t => t._id), get(credentials, '_id'));
  if (isTrainee && get(req, 'query.origin') === MOBILE) return null;

  const courseTrainerId = get(course, 'trainer') || null;
  const companies = course.type === INTRA ? course.companies : course.trainees.map(t => t.company);

  this.checkAuthorization(credentials, courseTrainerId, companies);

  return null;
};

exports.checkInterlocutors = async (req, courseCompanyId) => {
  if (get(req, 'payload.salesRepresentative')) await this.checkSalesRepresentativeExists(req);

  if (get(req, 'payload.trainer')) {
    const trainer = await User.findOne({ _id: req.payload.trainer }, { role: 1 })
      .lean({ autopopulate: true });

    if (![VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER].includes(get(trainer, 'role.vendor.name'))) {
      throw Boom.forbidden();
    }
  }
  if (get(req, 'payload.companyRepresentative')) {
    const companyRepresentative = await User
      .findOne({ _id: req.payload.companyRepresentative }, { role: 1 })
      .populate({ path: 'company' })
      .lean({ autopopulate: true });

    if (![COACH, CLIENT_ADMIN].includes(get(companyRepresentative, 'role.client.name'))) {
      throw Boom.forbidden();
    }
    if (!UtilsHelper.areObjectIdsEquals(companyRepresentative.company, courseCompanyId)) throw Boom.notFound();
  }

  return null;
};

exports.authorizeCourseEdit = async (req) => {
  try {
    const { credentials } = req.auth;
    const course = await Course
      .findOne({ _id: req.params._id })
      .populate({ path: 'slots', select: 'startDate endDate' })
      .populate({ path: 'slotsToPlan' })
      .populate({ path: 'contact' })
      .lean();
    if (!course) throw Boom.notFound();
    if (course.archivedAt) throw Boom.forbidden();

    const courseTrainerId = get(course, 'trainer') || null;
    const companies = course.type === INTRA ? course.companies : [];
    this.checkAuthorization(credentials, courseTrainerId, companies);

    const userVendorRole = get(req, 'auth.credentials.role.vendor.name');
    const isRofOrAdmin = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(userVendorRole);

    if ((get(req, 'payload.salesRepresentative') || get(req, 'payload.trainer')) && !isRofOrAdmin) {
      throw Boom.forbidden();
    }

    if ((get(req, 'payload.company')) && course.type !== INTER_B2B) throw Boom.forbidden();

    const trainerIsTrainee = UtilsHelper.doesArrayIncludeId(course.trainees, get(req, 'payload.trainer'));
    if (trainerIsTrainee) throw Boom.forbidden();

    if (get(req, 'payload.maxTrainees')) {
      if (!isRofOrAdmin) throw Boom.forbidden();
      if (course.type === INTER_B2B) throw Boom.badRequest();
      if ((req.payload.maxTrainees < course.trainees.length)) {
        throw Boom.forbidden(translate[language].maxTraineesSmallerThanRegistered);
      }
    }

    if (has(req, 'payload.expectedBillsCount')) {
      if (!isRofOrAdmin) throw Boom.forbidden();
      if (course.type === INTER_B2B) throw Boom.badRequest();

      const courseBills = await CourseBill.find({ course: course._id }, { courseCreditNote: 1 })
        .populate({ path: 'courseCreditNote', options: { isVendorUser: true } })
        .setOptions({ isVendorUser: true })
        .lean();

      const courseBillsWithoutCreditNote = courseBills.filter(cb => !cb.courseCreditNote);
      if (courseBillsWithoutCreditNote.length > req.payload.expectedBillsCount) throw Boom.conflict();
    }

    await this.checkInterlocutors(req, companies[0]);

    if (get(req, 'payload.contact')) {
      const isCompanyRepContactAndUpdated = !!get(req, 'payload.companyRepresentative') &&
        UtilsHelper.areObjectIdsEquals(course.companyRepresentative, get(course, 'contact._id'));
      const isUserFromCourseCompany = UtilsHelper.doesArrayIncludeId(companies, get(credentials, 'company._id'));
      if (!isRofOrAdmin && !(isCompanyRepContactAndUpdated && isUserFromCourseCompany)) throw Boom.forbidden();

      const payloadInterlocutors = pick(req.payload, ['salesRepresentative', 'trainer', 'companyRepresentative']);
      const courseInterlocutors = pick(course, ['salesRepresentative', 'trainer', 'companyRepresentative']);
      const interlocutors = { ...courseInterlocutors, ...payloadInterlocutors };

      if (!UtilsHelper.doesArrayIncludeId(Object.values(interlocutors), req.payload.contact)) throw Boom.forbidden();
    }

    const archivedAt = get(req, 'payload.archivedAt');
    if (archivedAt) {
      if (!isRofOrAdmin) return Boom.forbidden();

      if (!course.trainees.length || !course.slots.length) return Boom.forbidden();
      if (course.slotsToPlan.length) return Boom.forbidden();
      if (course.format !== BLENDED) return Boom.forbidden();
      if (course.slots.some(slot => CompaniDate(slot.endDate).isAfter(archivedAt))) return Boom.forbidden();
    }

    if (get(req, 'payload.estimatedStartDate') && (course.slots.length || !isRofOrAdmin)) return Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const authorizeGetListForOperations = (credentials, query) => {
  const courseTrainerId = query.trainer;

  this.checkAuthorization(credentials, courseTrainerId, [query.company]);

  return null;
};

const authorizeGetListForPedagogy = async (credentials, query) => {
  const loggedUserCompany = get(credentials, 'company._id');
  const loggedUserVendorRole = get(credentials, 'role.vendor.name');
  const loggedUserClientRole = get(credentials, 'role.client.name');

  if (!query.trainee) return null;

  const trainee = await User.findOne({ _id: query.trainee }, { company: 1 }).populate({ path: 'company' }).lean();
  if (!trainee) return Boom.notFound();

  const isRofOrAdmin = [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(loggedUserVendorRole);
  const isClientRoleFromSameCompany = [COACH, CLIENT_ADMIN].includes(loggedUserClientRole) &&
    UtilsHelper.areObjectIdsEquals(loggedUserCompany, trainee.company);
  if (!isRofOrAdmin && !isClientRoleFromSameCompany) throw Boom.forbidden();

  return null;
};

exports.authorizeGetList = async (req) => {
  const { credentials } = req.auth;
  const { action } = req.query;

  if (action === OPERATIONS) return authorizeGetListForOperations(credentials, req.query);

  return authorizeGetListForPedagogy(credentials, req.query);
};

exports.getCourseTrainee = async (req) => {
  try {
    const { payload } = req;
    const course = await Course
      .findOne({ _id: req.params._id }, { type: 1, trainees: 1, companies: 1, maxTrainees: 1, trainer: 1 })
      .lean();
    if (!course) throw Boom.notFound();

    if (course.trainees.length + 1 > course.maxTrainees) throw Boom.forbidden(translate[language].maxTraineesReached);

    const traineeExist = await User.countDocuments({ _id: payload.trainee });
    if (!traineeExist) throw Boom.forbidden();

    const traineeIsTrainer = UtilsHelper.areObjectIdsEquals(course.trainer, payload.trainee);
    if (traineeIsTrainer) throw Boom.forbidden();

    const userCompanyQuery = { user: payload.trainee, ...(course.type === INTRA && { company: course.companies[0] }) };
    const userCompanyExists = await UserCompany.countDocuments(userCompanyQuery);
    if (!userCompanyExists) throw Boom.notFound();

    const traineeAlreadyRegistered = course.trainees.some(t => UtilsHelper.areObjectIdsEquals(t, payload.trainee));
    if (traineeAlreadyRegistered) throw Boom.conflict(translate[language].courseTraineeAlreadyExists);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCourseDeletion = async (req) => {
  const course = await Course.findOne({ _id: req.params._id }, { trainees: 1 })
    .populate({ path: 'slots', select: '_id' })
    .populate({ path: 'slotsToPlan', select: '_id' })
    .lean();
  if (!course) return Boom.notFound();

  if (course.trainees.length) return Boom.forbidden(translate[language].courseDeletionForbidden.trainees);
  if (course.slots.length) {
    return Boom.forbidden(translate[language].courseDeletionForbidden.slots);
  }

  const courseBills = await CourseBill.countDocuments(
    { course: req.params._id, billedAt: { $exists: true, $type: 'date' } },
    { limit: 1 }
  );
  if (courseBills) return Boom.forbidden(translate[language].courseDeletionForbidden.billed);

  return null;
};

exports.authorizeRegisterToELearning = async (req) => {
  const course = await Course.findById(req.params._id).lean();

  if (!course) throw Boom.notFound();
  if (course.format !== STRICTLY_E_LEARNING) throw Boom.forbidden();

  const credentials = get(req, 'auth.credentials');
  if (course.trainees.some(trainee =>
    UtilsHelper.areObjectIdsEquals(trainee, get(credentials, '_id')))) throw Boom.forbidden();

  const { accessRules } = course;
  const companyId = get(credentials, 'company._id');
  if (accessRules.length &&
    (!companyId || !accessRules.some(id => UtilsHelper.areObjectIdsEquals(id, companyId)))) throw Boom.forbidden();

  return null;
};

exports.authorizeGetCourse = async (req) => {
  try {
    const credentials = get(req, 'auth.credentials');
    const userCompany = get(credentials, 'company._id');
    const userVendorRole = get(credentials, 'role.vendor.name');
    const userClientRole = get(credentials, 'role.client.name');

    const course = await Course
      .findOne({ _id: req.params._id }, { trainer: 1, format: 1, trainees: 1, companies: 1, accessRules: 1 })
      .lean();
    if (!course) throw Boom.notFound();

    const isAdminVendor = userVendorRole === VENDOR_ADMIN;
    const isTOM = userVendorRole === TRAINING_ORGANISATION_MANAGER;
    if (isTOM || isAdminVendor) return null;

    const isTrainee = UtilsHelper.doesArrayIncludeId(course.trainees, credentials._id);
    const companyHasAccess = !course.accessRules.length ||
      UtilsHelper.doesArrayIncludeId(course.accessRules, userCompany);

    if (isTrainee && !companyHasAccess) throw Boom.forbidden();
    else if (isTrainee) return null;

    const isTrainerAndAuthorized = userVendorRole === TRAINER &&
      UtilsHelper.areObjectIdsEquals(course.trainer, credentials._id);
    if (isTrainerAndAuthorized) return null;

    if (!userClientRole || ![COACH, CLIENT_ADMIN].includes(userClientRole)) throw Boom.forbidden();

    if (course.format === STRICTLY_E_LEARNING && !companyHasAccess) throw Boom.forbidden();

    if (course.format === BLENDED) {
      const courseCompaniesContainsUserCompany = UtilsHelper.doesArrayIncludeId(course.companies, userCompany);
      if (!courseCompaniesContainsUserCompany) throw Boom.forbidden();
    }

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.getCourse = async (req) => {
  const course = await Course.findById(req.params._id)
    .populate({ path: 'slots', select: 'startDate endDate' })
    .populate({ path: 'slotsToPlan' })
    .populate({ path: 'trainees', select: 'contact.phone', populate: { path: 'company' } })
    .populate({ path: 'contact', select: 'identity.lastname contact.phone' })
    .lean();
  if (!course) throw Boom.notFound();

  return course;
};

exports.authorizeAccessRuleAddition = async (req) => {
  const course = await Course.findById(req.params._id, 'accessRules').lean();
  if (!course) throw Boom.notFound();

  const accessRuleAlreadyExist = UtilsHelper.doesArrayIncludeId(course.accessRules, req.payload.company);
  if (accessRuleAlreadyExist) throw Boom.conflict();

  const companyExists = await Company.countDocuments({ _id: req.payload.company });
  if (!companyExists) throw Boom.badRequest();

  return null;
};

exports.authorizeAccessRuleDeletion = async (req) => {
  const course = await Course.countDocuments({ _id: req.params._id, accessRules: req.params.accessRuleId });

  if (!course) throw Boom.notFound();

  return null;
};

exports.authorizeGetFollowUp = async (req) => {
  const credentials = get(req, 'auth.credentials');
  const loggedUserVendorRole = get(credentials, 'role.vendor.name');
  const companyQueryIsValid = !!req.query.company &&
    UtilsHelper.areObjectIdsEquals(get(credentials, 'company._id'), req.query.company);

  if (!loggedUserVendorRole && !companyQueryIsValid) throw Boom.forbidden();

  return null;
};

exports.authorizeGetQuestionnaires = async (req) => {
  const credentials = get(req, 'auth.credentials');
  const countQuery = get(credentials, 'role.vendor.name') === TRAINER
    ? { _id: req.params._id, format: BLENDED, trainer: credentials._id }
    : { _id: req.params._id, format: BLENDED };
  const course = await Course.countDocuments(countQuery);
  if (!course) throw Boom.notFound();

  return null;
};

exports.authorizeGetAttendanceSheets = async (req) => {
  await exports.authorizeGetDocumentsAndSms(req);

  const slots = await CourseSlot.find({ course: req.params._id }).populate({ path: 'step', select: 'type' }).lean();
  if (!slots.some(s => s.step.type === ON_SITE)) throw Boom.notFound(translate[language].courseAttendanceNotGenerated);

  return null;
};

exports.authorizeSmsSending = async (req) => {
  const { course } = req.pre;

  const isFinished = !course.slots || !course.slots.some(slot => CompaniDate().isBefore(slot.endDate));
  const isStarted = course.slots && course.slots.some(slot => CompaniDate().isAfter(slot.endDate));
  const noReceiver = !course.trainees || !course.trainees.some(trainee => get(trainee, 'contact.phone'));
  if ((isFinished && req.payload.type !== OTHER) || (isStarted && req.payload.type === CONVOCATION) || noReceiver) {
    throw Boom.forbidden();
  }

  return null;
};

exports.authorizeCourseCompanyAddition = async (req) => {
  const company = await Company.countDocuments({ _id: req.payload.company });
  if (!company) throw Boom.notFound();

  const isAlreadyLinked = await Course.countDocuments({ _id: req.params._id, companies: req.payload.company });
  if (isAlreadyLinked) throw Boom.conflict(translate[language].courseCompanyAlreadyExists);

  return null;
};

exports.authorizeCourseCompanyDeletion = async (req) => {
  const { companyId } = req.params;
  const course = await Course.findOne({ _id: req.params._id })
    .populate({ path: 'trainees', select: 'company', populate: 'company' })
    .lean();
  if (!course) throw Boom.notFound();

  if (!UtilsHelper.doesArrayIncludeId(course.companies, companyId) || course.type !== INTER_B2B) throw Boom.forbidden();

  const companyTraineesAreRegistered = course.trainees.some(t => UtilsHelper.areObjectIdsEquals(t.company, companyId));
  if (companyTraineesAreRegistered) throw Boom.forbidden(translate[language].companyTraineeRegisteredToCourse);

  return null;
};
