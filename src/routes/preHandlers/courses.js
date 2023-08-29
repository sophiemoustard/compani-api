const Boom = require('@hapi/boom');
const get = require('lodash/get');
const has = require('lodash/has');
const pick = require('lodash/pick');
const Course = require('../../models/Course');
const User = require('../../models/User');
const CourseSlot = require('../../models/CourseSlot');
const Company = require('../../models/Company');
const CourseBill = require('../../models/CourseBill');
const AttendanceSheet = require('../../models/AttendanceSheet');
const SubProgram = require('../../models/SubProgram');
const {
  TRAINER,
  INTRA,
  INTER_B2B,
  VENDOR_ADMIN,
  CLIENT_ADMIN,
  COACH,
  TRAINING_ORGANISATION_MANAGER,
  STRICTLY_E_LEARNING,
  E_LEARNING,
  BLENDED,
  ON_SITE,
  MOBILE,
  OTHER,
  OPERATIONS,
  CONVOCATION,
  COURSE,
  TRAINEE,
  PEDAGOGY,
  PUBLISHED,
} = require('../../helpers/constants');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const CourseHistoriesHelper = require('../../helpers/courseHistories');
const { CompaniDate } = require('../../helpers/dates/companiDates');
const UserCompaniesHelper = require('../../helpers/userCompanies');

const { language } = translate;

exports.checkAuthorization = (credentials, courseTrainerId, companies) => {
  const userVendorRole = get(credentials, 'role.vendor.name');
  const userClientRole = get(credentials, 'role.client.name');
  const userId = get(credentials, '_id');

  const isAdminVendor = userVendorRole === VENDOR_ADMIN;
  const isTOM = userVendorRole === TRAINING_ORGANISATION_MANAGER;
  const isTrainerAndAuthorized = userVendorRole === TRAINER && UtilsHelper.areObjectIdsEquals(userId, courseTrainerId);
  const isClientOrHoldingAndAuthorized = [CLIENT_ADMIN, COACH].includes(userClientRole) &&
    companies.some(company => UtilsHelper.hasUserAccessToCompany(credentials, company));

  if (!isAdminVendor && !isTOM && !isTrainerAndAuthorized && !isClientOrHoldingAndAuthorized) {
    throw Boom.forbidden();
  }
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

  const subProgram = await SubProgram
    .findOne({ _id: req.payload.subProgram })
    .populate({ path: 'steps', select: 'type' })
    .lean({ virtuals: true });

  if (!subProgram) throw Boom.notFound();
  if (subProgram.status !== PUBLISHED || subProgram.isStrictlyELearning) throw Boom.forbidden();

  if (get(req, 'payload.company')) {
    const { company } = req.payload;

    const companyExists = await Company.countDocuments({ _id: company });
    if (!companyExists) throw Boom.notFound();
  }

  return null;
};

exports.authorizeGetDocumentsAndSms = async (req) => {
  const { credentials } = req.auth;

  const course = await Course
    .findOne({ _id: req.params._id }, { trainees: 1, companies: 1, trainer: 1, type: 1 })
    .lean();
  if (!course) throw Boom.notFound();

  const isTrainee = UtilsHelper.doesArrayIncludeId(course.trainees, get(credentials, '_id'));
  if (isTrainee && get(req, 'query.origin') === MOBILE) return null;

  const courseTrainerId = get(course, 'trainer') || null;
  this.checkAuthorization(credentials, courseTrainerId, course.companies);

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
      const hasUserAccessToCourseCompany = companies.some(c => UtilsHelper.hasUserAccessToCompany(credentials, c));
      if (!isRofOrAdmin && !(isCompanyRepContactAndUpdated && hasUserAccessToCourseCompany)) throw Boom.forbidden();

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

  if (query.holding) {
    if (!get(credentials, 'holding._id') || !UtilsHelper.areObjectIdsEquals(credentials.holding._id, query.holding)) {
      throw Boom.forbidden();
    }
  } else {
    this.checkAuthorization(credentials, courseTrainerId, [query.company]);
  }

  return null;
};

const authorizeGetListForPedagogy = async (credentials, query) => {
  const loggedUserCompany = get(credentials, 'company._id');
  const loggedUserVendorRole = get(credentials, 'role.vendor.name');
  const loggedUserClientRole = get(credentials, 'role.client.name');

  if (!query.trainee) return null;

  const trainee = await User.countDocuments({ _id: query.trainee });
  if (!trainee) return Boom.notFound();

  const isRofOrAdmin = [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(loggedUserVendorRole);
  const isClientRoleFromQueryCompany = [COACH, CLIENT_ADMIN].includes(loggedUserClientRole) &&
    UtilsHelper.areObjectIdsEquals(loggedUserCompany, query.company);
  if (!isRofOrAdmin && !isClientRoleFromQueryCompany) throw Boom.forbidden();

  return null;
};

exports.authorizeGetList = async (req) => {
  const { credentials } = req.auth;
  const { action, format } = req.query;

  if (has(req.query, 'isArchived') && format !== BLENDED) throw Boom.badRequest();

  if (action === OPERATIONS) return authorizeGetListForOperations(credentials, req.query);

  return authorizeGetListForPedagogy(credentials, req.query);
};

exports.authorizeTraineeAddition = async (req) => {
  try {
    const { payload } = req;
    const course = await Course
      .findOne({ _id: req.params._id }, { trainees: 1, type: 1, companies: 1, maxTrainees: 1, trainer: 1 })
      .lean();

    if (course.type === INTRA && !!payload.company) throw Boom.badData();
    if (course.type === INTER_B2B && !payload.company) throw Boom.badData();

    const isTrainer = get(req, 'auth.credentials.role.vendor.name') === TRAINER;
    if (course.type === INTER_B2B && isTrainer) throw Boom.forbidden();

    if (course.trainees.length + 1 > course.maxTrainees) throw Boom.forbidden(translate[language].maxTraineesReached);

    const traineeIsTrainer = UtilsHelper.areObjectIdsEquals(course.trainer, payload.trainee);
    if (traineeIsTrainer) throw Boom.forbidden();

    const trainee = await User.findOne({ _id: payload.trainee }, { _id: 1 })
      .populate({ path: 'userCompanyList' })
      .lean();
    if (!trainee) throw Boom.notFound();

    if (course.type === INTRA) {
      if (!UserCompaniesHelper.userIsOrWillBeInCompany(trainee.userCompanyList, course.companies[0])) {
        throw Boom.notFound();
      }
    } else {
      const currentAndFuturCompanies = UserCompaniesHelper.getCurrentAndFutureCompanies(trainee.userCompanyList);
      if (!UtilsHelper.doesArrayIncludeId(currentAndFuturCompanies, payload.company)) throw Boom.notFound();
      if (!UtilsHelper.doesArrayIncludeId(course.companies, payload.company)) throw Boom.conflict();
    }

    const traineeAlreadyRegistered = course.trainees.some(t => UtilsHelper.areObjectIdsEquals(t, payload.trainee));
    if (traineeAlreadyRegistered) throw Boom.conflict(translate[language].courseTraineeAlreadyExists);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeTraineeDeletion = async (req) => {
  const course = await Course.findOne({ _id: req.params._id }, { type: 1, trainees: 1 }).lean();

  const isTrainer = get(req, 'auth.credentials.role.vendor.name') === TRAINER;
  if (course.type === INTER_B2B && isTrainer) throw Boom.forbidden();
  if (!UtilsHelper.doesArrayIncludeId(course.trainees, req.params.traineeId)) throw Boom.forbidden();

  return null;
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

    const course = await Course
      .findOne({ _id: req.params._id }, { trainer: 1, format: 1, trainees: 1, companies: 1, accessRules: 1 })
      .lean();
    if (!course) throw Boom.notFound();

    if (!credentials) {
      if ([PEDAGOGY, OPERATIONS].includes(req.query.action)) throw Boom.badRequest();
      return null;
    }

    const userCompany = get(credentials, 'company._id');
    const userVendorRole = get(credentials, 'role.vendor.name');
    const userClientRole = get(credentials, 'role.client.name');
    const isAdminVendor = userVendorRole === VENDOR_ADMIN;
    const isTOM = userVendorRole === TRAINING_ORGANISATION_MANAGER;
    if (isTOM || isAdminVendor) return null;

    const isTrainee = UtilsHelper.doesArrayIncludeId(course.trainees, credentials._id);

    if (isTrainee) return null;

    const isTrainerAndAuthorized = userVendorRole === TRAINER &&
      UtilsHelper.areObjectIdsEquals(course.trainer, credentials._id);
    if (isTrainerAndAuthorized) return null;

    if (!userClientRole || ![COACH, CLIENT_ADMIN].includes(userClientRole)) throw Boom.forbidden();

    const companyHasAccess = !course.accessRules.length ||
      UtilsHelper.doesArrayIncludeId(course.accessRules, userCompany);
    if (course.format === STRICTLY_E_LEARNING && !companyHasAccess) throw Boom.forbidden();

    if (course.format === BLENDED) {
      const clientUserHasAccess = course.companies
        .some(company => UtilsHelper.hasUserAccessToCompany(credentials, company));
      if (!clientUserHasAccess) throw Boom.forbidden();
    }

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeAccessRuleAddition = async (req) => {
  const course = await Course.findById(req.params._id, 'accessRules').lean();
  if (!course) throw Boom.notFound();

  const accessRuleAlreadyExist = UtilsHelper.doesArrayIncludeId(course.accessRules, req.payload.company);
  if (accessRuleAlreadyExist) throw Boom.conflict();

  const companyExists = await Company.countDocuments({ _id: req.payload.company });
  if (!companyExists) throw Boom.notFound();

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
  const isClientAndAuthorized = !!req.query.company &&
    UtilsHelper.areObjectIdsEquals(get(credentials, 'company._id'), req.query.company);

  const isHoldingAndAuthorized = !!req.query.holding &&
    UtilsHelper.areObjectIdsEquals(get(credentials, 'holding._id'), req.query.holding);

  if (!loggedUserVendorRole && !isClientAndAuthorized && !isHoldingAndAuthorized) throw Boom.forbidden();

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
  const { credentials } = req.auth;
  const userVendorRole = get(credentials, 'role.vendor.name');

  const slots = await CourseSlot.find({ course: req.params._id }).populate({ path: 'step', select: 'type' }).lean();
  if (!slots.some(s => s.step.type === ON_SITE)) throw Boom.notFound(translate[language].courseAttendanceNotGenerated);

  const course = await Course.findOne({ _id: req.params._id }, { type: 1 }).lean();
  if (course.type === INTER_B2B && !userVendorRole) throw Boom.forbidden();

  return null;
};

exports.authorizeSmsSending = async (req) => {
  const course = await Course.findById(req.params._id, { slots: 1, trainees: 1, type: 1, companies: 1, trainer: 1 })
    .populate({ path: 'slots', select: 'endDate' })
    .populate({ path: 'trainees', select: 'contact.phone' })
    .lean();
  if (!course) throw Boom.notFound();

  const { credentials } = req.auth;
  const courseTrainerId = get(course, 'trainer') || null;
  const companies = course.type === INTRA ? course.companies : [];
  this.checkAuthorization(credentials, courseTrainerId, companies);

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

  const course = await Course.findOne({ _id: req.params._id }, { type: 1, companies: 1 }).lean();

  if (course.type !== INTER_B2B) throw Boom.forbidden();

  const isAlreadyLinked = UtilsHelper.doesArrayIncludeId(course.companies, req.payload.company);
  if (isAlreadyLinked) throw Boom.conflict(translate[language].courseCompanyAlreadyExists);

  const isTrainer = get(req, 'auth.credentials.role.vendor.name') === TRAINER;
  if (isTrainer) throw Boom.forbidden();

  return null;
};

exports.authorizeCourseCompanyDeletion = async (req) => {
  const { companyId } = req.params;
  const isVendorUser = !!get(req, 'auth.credentials.role.vendor');

  const course = await Course.findOne({ _id: req.params._id })
    .populate({ path: 'bills', select: 'company', options: { isVendorUser } })
    .populate({
      path: 'slots',
      select: 'attendances',
      populate: {
        path: 'attendances',
        select: 'company',
        options: { isVendorUser },
      },
    })
    .lean();

  if (!UtilsHelper.doesArrayIncludeId(course.companies, companyId) || course.type !== INTER_B2B) throw Boom.forbidden();

  const traineesCompanyAtCourseRegistration = await CourseHistoriesHelper.getCompanyAtCourseRegistrationList(
    { key: COURSE, value: req.params._id }, { key: TRAINEE, value: course.trainees }
  );
  const companiesAtRegistration = traineesCompanyAtCourseRegistration.map(traineeCompany => traineeCompany.company);

  if (UtilsHelper.doesArrayIncludeId(companiesAtRegistration, companyId)) {
    throw Boom.forbidden(translate[language].companyTraineeRegisteredToCourse);
  }

  const hasAttendancesFromCompany = course.slots.some(slot =>
    slot.attendances.some(attendance => UtilsHelper.areObjectIdsEquals(companyId, attendance.company)));
  if (hasAttendancesFromCompany) throw Boom.forbidden(translate[language].companyTraineeAttendedToCourse);

  const attendanceSheets = await AttendanceSheet
    .find({ course: course._id }, { company: 1 })
    .setOptions({ isVendorUser })
    .lean();

  const hasAttendanceSheetsFromCompany = attendanceSheets
    .some(sheet => UtilsHelper.areObjectIdsEquals(companyId, sheet.company));
  if (hasAttendanceSheetsFromCompany) {
    throw Boom.forbidden(translate[language].CompanyTraineeHasAttendanceSheetForCourse);
  }

  if (course.bills.some(bill => UtilsHelper.areObjectIdsEquals(companyId, bill.company))) {
    throw Boom.forbidden(translate[language].companyHasCourseBill);
  }

  const isTrainer = get(req, 'auth.credentials.role.vendor.name') === TRAINER;
  if (isTrainer) throw Boom.forbidden();

  return null;
};

exports.authorizeGetConvocationPdf = async (req) => {
  const course = await Course.countDocuments({ _id: req.params._id });
  if (!course) throw Boom.notFound();

  return null;
};

exports.authorizeGenerateTrainingContract = async (req) => {
  const course = await Course
    .findOne({ _id: req.params._id }, { _id: 1 })
    .populate([
      { path: 'companies', select: 'address' },
      {
        path: 'subProgram',
        select: 'steps',
        populate: [{ path: 'steps', select: 'theoreticalDuration type' }],
      },
      { path: 'slotsToPlan' },
    ])
    .lean();

  if (!course) throw Boom.notFound();

  const company = course.companies.find(c => UtilsHelper.areObjectIdsEquals(c._id, req.payload.company));
  if (!company) throw Boom.forbidden();
  if (!company.address) throw Boom.forbidden(translate[language].courseCompanyAddressMissing);
  if (course.slotsToPlan.length) {
    const theoreticalDurationList = course.subProgram.steps
      .filter(step => step.type !== E_LEARNING)
      .map(step => step.theoreticalDuration);
    if (theoreticalDurationList.some(duration => !duration)) {
      throw Boom.badData(translate[language].stepsTheoreticalDurationsNotDefined);
    }
  }

  return null;
};
