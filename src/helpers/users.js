const Boom = require('@hapi/boom');
const moment = require('moment');
const pickBy = require('lodash/pickBy');
const get = require('lodash/get');
const has = require('lodash/has');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const uniqBy = require('lodash/uniqBy');
const flat = require('flat');
const { v4: uuidv4 } = require('uuid');
const { groupBy } = require('lodash');
const CompanyLinkRequest = require('../models/CompanyLinkRequest');
const ActivityHistory = require('../models/ActivityHistory');
const Role = require('../models/Role');
const User = require('../models/User');
const Course = require('../models/Course');
const CourseHistory = require('../models/CourseHistory');
const UserCompany = require('../models/UserCompany');
const Contract = require('../models/Contract');
const translate = require('./translate');
const GCloudStorageHelper = require('./gCloudStorage');
const {
  TRAINER,
  AUXILIARY_ROLES,
  HELPER,
  AUXILIARY_WITHOUT_COMPANY,
  CLIENT_ADMIN,
  COACH,
  TRAINEE_ADDITION,
  STRICTLY_E_LEARNING,
} = require('./constants');
const SectorHistoriesHelper = require('./sectorHistories');
const GDriveStorageHelper = require('./gDriveStorage');
const UtilsHelper = require('./utils');
const HelpersHelper = require('./helpers');
const UserCompaniesHelper = require('./userCompanies');
const DatesUtilsHelper = require('./dates/utils');
const { CompaniDate } = require('./dates/companiDates');

const { language } = translate;

exports.formatQueryForUsersList = async (query) => {
  const formattedQuery = pickBy(omit(query, ['role', 'company']));

  if (query.role) {
    const roleNames = Array.isArray(query.role) ? query.role : [query.role];
    const roles = await Role.find({ name: { $in: roleNames } }, { _id: 1, interface: 1 }).lean();
    if (!roles.length) throw Boom.notFound(translate[language].roleNotFound);

    formattedQuery[`role.${roles[0].interface}`] = { $in: roles.map(role => role._id) };
  }

  if (query.company) {
    const users = await UserCompany.find({ company: query.company }, { user: 1 }).lean();

    formattedQuery._id = { $in: users.map(u => u.user) };
  }

  return formattedQuery;
};

exports.getUsersList = async (query, credentials) => {
  const params = await exports.formatQueryForUsersList(query);

  return User.find(params, {}, { autopopulate: false })
    .populate({ path: 'role.client', select: '-__v -createdAt -updatedAt' })
    .populate({ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' })
    .populate({
      path: 'sector',
      select: '_id sector',
      match: { company: get(credentials, 'company._id') },
      options: { isVendorUser: has(credentials, 'role.vendor') },
    })
    .populate({ path: 'contracts', select: 'startDate endDate' })
    .setOptions({ isVendorUser: has(credentials, 'role.vendor') })
    .lean({ virtuals: true, autopopulate: true });
};

exports.getUsersListWithSectorHistories = async (query, credentials) => {
  const params = await exports.formatQueryForUsersList({ ...query, role: AUXILIARY_ROLES });

  return User.find(params, {}, { autopopulate: false })
    .populate({ path: 'role.client', select: '-__v -createdAt -updatedAt' })
    .populate({ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' })
    .populate({
      path: 'sectorHistories',
      select: '_id sector startDate endDate',
      match: { company: get(credentials, 'company._id') },
      options: { isVendorUser: has(credentials, 'role.vendor') },
    })
    .populate({ path: 'contracts', select: 'startDate endDate' })
    .setOptions({ isVendorUser: has(credentials, 'role.vendor') })
    .lean({ virtuals: true, autopopulate: true });
};

const formatQueryForLearnerList = async (query) => {
  let userCompanyQuery = { company: { $in: query.companies } };
  if (query.startDate && query.endDate) {
    userCompanyQuery = {
      ...userCompanyQuery,
      startDate: { $lt: CompaniDate(query.endDate).toISO() },
      $or: [{ endDate: { $gt: CompaniDate(query.startDate).toISO() } }, { endDate: { $exists: false } }],
    };
  } else if (query.startDate) {
    userCompanyQuery = {
      ...userCompanyQuery,
      $or: [{ endDate: { $exists: false } }, { endDate: { $gt: CompaniDate(query.startDate).toISO() } }],
    };
  } else {
    userCompanyQuery = {
      ...userCompanyQuery,
      startDate: { $lt: CompaniDate().toISO() },
      $or: [{ endDate: { $exists: false } }, { endDate: { $gt: CompaniDate().toISO() } }],
    };
  }
  const rolesToExclude = await Role.find({ name: { $in: [HELPER, AUXILIARY_WITHOUT_COMPANY] } }).lean();
  const usersCompany = await UserCompany.find(userCompanyQuery, { user: 1 }).lean();

  return {
    _id: { $in: usersCompany.map(uc => uc.user) },
    'role.client': { $not: { $in: rolesToExclude.map(r => r._id) } },
  };
};

exports.getLearnerList = async (query, credentials) => {
  const userQuery = query.companies ? await formatQueryForLearnerList(query) : {};

  const learnerList = await User
    .find(userQuery, 'identity.firstname identity.lastname picture local.email', { autopopulate: false })
    .populate({ path: 'company', populate: { path: 'company', select: 'name' } })
    .populate({ path: 'activityHistories', select: 'updatedAt', options: { sort: { updatedAt: -1 } } })
    .populate({ path: 'userCompanyList', populate: { path: 'company', select: 'name' } })
    .setOptions({ isVendorUser: !!get(credentials, 'role.vendor') })
    .lean();

  let blendedCourseRegistrations = {};
  let eLearningCoursesGroupedByTrainee = {};
  if (!Array.isArray(query.companies)) {
    const blendedCourseAdditionHistories = await CourseHistory
      .find({ trainee: { $in: learnerList.map(learner => learner._id) }, action: TRAINEE_ADDITION })
      .populate({ path: 'course', select: 'trainees' })
      .lean();

    const eLearningCourseRegistrations = await Course
      .find({ trainees: { $in: learnerList.map(learner => learner._id) }, format: STRICTLY_E_LEARNING })
      .lean();

    blendedCourseRegistrations = groupBy(blendedCourseAdditionHistories
      .filter(history => UtilsHelper.doesArrayIncludeId(history.course.trainees, history.trainee)), 'trainee');

    const traineeELearningCourseList = eLearningCourseRegistrations
      .map(course => course.trainees.map(trainee => ({ trainee, course })))
      .flat();
    eLearningCoursesGroupedByTrainee = groupBy(traineeELearningCourseList, 'trainee');

    for (const learner of learnerList) {
      if (blendedCourseRegistrations[learner._id]) {
        const learnerRegistration = blendedCourseRegistrations[learner._id]
          .sort(DatesUtilsHelper.descendingSortBy('createdAt'));
        blendedCourseRegistrations[learner._id] = uniqBy(learnerRegistration, 'course._id');
      } else {
        blendedCourseRegistrations[learner._id] = [];
      }
      if (eLearningCoursesGroupedByTrainee[learner._id]) {
        eLearningCoursesGroupedByTrainee[learner._id] = eLearningCoursesGroupedByTrainee[learner._id]
          .map(tc => tc.course);
      } else {
        eLearningCoursesGroupedByTrainee[learner._id] = [];
      }
    }
  }

  return learnerList.map(learner => ({
    ...omit(learner, 'activityHistories'),
    activityHistoryCount: learner.activityHistories.length,
    lastActivityHistory: learner.activityHistories[0],
    ...(!Array.isArray(query.companies) && {
      blendedCoursesCount: !query.companies
        ? blendedCourseRegistrations[learner._id].length
        : blendedCourseRegistrations[learner._id]
          .filter(history => UtilsHelper.areObjectIdsEquals(history.company, query.companies))
          .length,
      eLearningCoursesCount: !query.companies
        ? eLearningCoursesGroupedByTrainee[learner._id].length
        : eLearningCoursesGroupedByTrainee[learner._id]
          .filter(course => !course.accessRules.length ||
            UtilsHelper.doesArrayIncludeId(course.accessRules, query.companies)
          )
          .length,
    }
    ),
  }));
};

exports.getUser = async (userId, credentials) => {
  const companyId = get(credentials, 'company._id') || null;
  const isVendorUser = has(credentials, 'role.vendor');
  const requestingOwnInfos = UtilsHelper.areObjectIdsEquals(userId, credentials._id);

  const user = await User.findOne({ _id: userId })
    .populate({ path: 'contracts', select: '-__v -createdAt -updatedAt' })
    .populate({ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' })
    .populate({
      path: 'sector',
      select: '_id sector',
      match: { company: companyId },
      options: { isVendorUser, requestingOwnInfos },
    })
    .populate({
      path: 'customers',
      select: '-__v -createdAt -updatedAt',
      match: { company: companyId },
      options: { isVendorUser, requestingOwnInfos },
    })
    .populate({ path: 'companyLinkRequest', populate: { path: 'company', select: '_id name' } })
    .populate({ path: 'establishment', select: 'siret' })
    .populate({ path: 'userCompanyList' })
    .lean({ autopopulate: true, virtuals: true });

  if (!user) throw Boom.notFound(translate[language].userNotFound);

  return isVendorUser || requestingOwnInfos
    ? user
    : {
      ...user,
      userCompanyList: user.userCompanyList.filter(uc => UtilsHelper.areObjectIdsEquals(companyId, get(uc, 'company'))),
    };
};

exports.userExists = async (email, credentials) => {
  const targetUser = await User
    .findOne(
      { 'local.email': email },
      { role: 1, 'local.email': 1, 'identity.firstname': 1, 'identity.lastname': 1, 'contact.phone': 1 }
    )
    .populate({ path: 'company' })
    .populate({ path: 'userCompanyList', options: { sort: { startDate: 1 } } })
    .lean();

  if (!targetUser) return { exists: false, user: {} };
  if (!credentials) return { exists: true, user: {} };

  const companyId = get(credentials, 'company._id');
  const loggedUserHasVendorRole = has(credentials, 'role.vendor');

  const loggedUserHasCoachRights = [COACH, CLIENT_ADMIN].includes(get(credentials, 'role.client.name'));
  const sameCompany = UserCompaniesHelper.userIsOrWillBeInCompany(targetUser.userCompanyList, companyId);
  const currentAndFuturCompanies = UserCompaniesHelper.getCurrentAndFutureCompanies(targetUser.userCompanyList);
  const coachCanReadAllUserInfo = loggedUserHasCoachRights && (sameCompany || !currentAndFuturCompanies.length);
  const doesEveryUserCompanyHasEndDate = targetUser.userCompanyList.every(uc => uc.endDate);
  const canReadInfo = loggedUserHasVendorRole || coachCanReadAllUserInfo ||
    (loggedUserHasCoachRights && doesEveryUserCompanyHasEndDate);

  if (canReadInfo) {
    let userCompanyList;
    if (loggedUserHasVendorRole) userCompanyList = targetUser.userCompanyList;
    else if (coachCanReadAllUserInfo) {
      userCompanyList = targetUser.userCompanyList.filter(uc => UtilsHelper.areObjectIdsEquals(companyId, uc.company));
    } else {
      userCompanyList = [UtilsHelper.getLastVersion(targetUser.userCompanyList, 'startDate')];
    }

    const userFieldsToPick = ['_id', 'local.email', 'identity.firstname', 'identity.lastname', 'contact.phone', 'role'];
    return {
      exists: true,
      user: {
        ...pick(targetUser, [...userFieldsToPick, (loggedUserHasVendorRole || coachCanReadAllUserInfo) && 'company']),
        userCompanyList: userCompanyList.map(uc => pick(uc, ['company', 'startDate', 'endDate'])),
      },
    };
  }

  return { exists: true, user: {} };
};

exports.saveCertificateDriveId = async (userId, fileInfo) =>
  User.updateOne({ _id: userId }, { $push: { 'administrative.certificates': fileInfo } });

exports.saveFile = async (userId, administrativeKey, fileInfo) =>
  User.updateOne({ _id: userId }, { $set: flat({ administrative: { [administrativeKey]: fileInfo } }) });

exports.createAndSaveFile = async (params, payload) => {
  const uploadedFile = await GDriveStorageHelper.addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload.type.hapi.filename,
    type: payload['Content-Type'],
    body: payload.file,
  });

  const file = { driveId: uploadedFile.id, link: uploadedFile.webViewLink };
  switch (payload.type) {
    case 'certificates':
      await exports.saveCertificateDriveId(params._id, file);
      break;
    default:
      await exports.saveFile(params._id, payload.type, file);
      break;
  }

  return uploadedFile;
};

const createUserCompany = async (payload, company) => {
  const user = await User.create(payload);
  await UserCompaniesHelper.create({
    user: user._id,
    company,
    ...(payload.userCompanyStartDate && { startDate: payload.userCompanyStartDate }),
  });

  return user;
};

/**
 * 1st case : No role / no company => handle payload as given
 *  - User creates his account
 *  - Vendor admin creates program tester
 * 2nd case : Client role creates user for his organization => set company with the one in credentials
 * + role (if needed)
 *  - if sector is given => add sector history (for auxiliary and planning referent)
 * 3rd case : Vendor role creates user for one organization => set company with the one in payload + role (if needed)
 * 4th case : Vendor role creates trainer => do no set company
 */
exports.createUser = async (userPayload, credentials) => {
  const payload = { ...omit(userPayload, ['role', 'sector', 'customer']), refreshToken: uuidv4() };

  if (!credentials) return User.create(payload);

  const companyId = payload.company || get(credentials, 'company._id');
  if (!userPayload.role) return createUserCompany(payload, companyId);

  const role = await Role.findById(userPayload.role, { name: 1, interface: 1 }).lean();
  if (!role) throw Boom.badRequest(translate[language].unknownRole);

  if (role.name === TRAINER) return User.create({ ...payload, role: { [role.interface]: role._id } });

  const user = await createUserCompany({ ...payload, role: { [role.interface]: role._id } }, companyId);

  if (userPayload.customer) await HelpersHelper.create(user._id, userPayload.customer, companyId);

  if (userPayload.sector) {
    await SectorHistoriesHelper.createHistory({ _id: user._id, sector: userPayload.sector }, companyId);
  }

  return User.findOne({ _id: user._id })
    .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
    .lean({ virtuals: true, autopopulate: true });
};

const formatUpdatePayload = async (updatedUser) => {
  const payload = omit(updatedUser, ['role', 'customer', 'sector', 'company']);

  if (updatedUser.role) {
    const role = await Role.findById(updatedUser.role, { name: 1, interface: 1 }).lean();
    if (!role) throw Boom.badRequest(translate[language].unknownRole);

    payload.role = { [role.interface]: role._id.toHexString() };
  }

  return payload;
};

exports.updateUser = async (userId, userPayload, credentials) => {
  const companyId = get(credentials, 'company._id');

  const payload = await formatUpdatePayload(userPayload);
  if (userPayload.customer) await HelpersHelper.create(userId, userPayload.customer, companyId);
  if (userPayload.company) {
    await UserCompaniesHelper.create({
      user: userId,
      company: userPayload.company,
      ...(userPayload.userCompanyStartDate && { startDate: userPayload.userCompanyStartDate }),
    });
  }

  if (userPayload.sector) {
    await SectorHistoriesHelper.updateHistoryOnSectorUpdate(userId, userPayload.sector, companyId);
  }

  await User.updateOne({ _id: userId }, { $set: flat(payload) });
};

exports.updateUserCertificates = async (userId, userPayload) =>
  User.updateOne({ _id: userId }, { $pull: { 'administrative.certificates': userPayload.certificates } });

exports.updateUserInactivityDate = async (user, contractEndDate, credentials) => {
  const notEndedContractCount = await Contract.countDocuments({
    user,
    company: get(credentials, 'company._id', null),
    $or: [{ endDate: { $exists: false } }, { endDate: null }],
  });

  if (!notEndedContractCount) {
    await User.updateOne(
      { _id: user },
      { $set: { inactivityDate: moment(contractEndDate).add('1', 'month').startOf('M').toDate() } }
    );
  }
};

exports.removeUser = async (user, credentials) => {
  if (UtilsHelper.areObjectIdsEquals(user._id, credentials._id)) {
    await CompanyLinkRequest.deleteOne({ user: user._id });
    await Course.updateMany({ trainees: user._id }, { $pull: { trainees: user._id } });
    await ActivityHistory.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
  } else {
    await exports.removeHelper(user);
  }
};

exports.removeHelper = async (user) => {
  await HelpersHelper.remove(user._id);
  await UserCompany.deleteOne({ user: user._id });
  await User.updateOne({ _id: user._id }, { $unset: { 'role.client': '' } });
};

exports.uploadPicture = async (userId, payload) => {
  const picture = await GCloudStorageHelper.uploadUserMedia(payload);

  await User.updateOne({ _id: userId }, { $set: flat({ picture }) });
};

exports.deletePicture = async (userId, publicId) => {
  if (!publicId) return;

  await User.updateOne({ _id: userId }, { $unset: { 'picture.publicId': '', 'picture.link': '' } });
  await GCloudStorageHelper.deleteUserMedia(publicId);
};

exports.createDriveFolder = async (userId, credentials) => {
  const loggedUserCompany = get(credentials, 'company._id');

  const userCompany = await UserCompany
    .findOne({ user: userId, company: loggedUserCompany })
    .populate({ path: 'company', select: 'auxiliariesFolderId' })
    .populate({ path: 'user', select: 'identity' })
    .lean();
  if (!get(userCompany, 'company.auxiliariesFolderId')) throw Boom.badData();

  const folder = await GDriveStorageHelper
    .createFolder(userCompany.user.identity, userCompany.company.auxiliariesFolderId);

  const administrative = { driveFolder: { link: folder.webViewLink, driveId: folder.id } };

  await User.updateOne({ _id: userId }, { $set: flat({ administrative }) });
};

exports.addExpoToken = async (payload, credentials) => User.updateOne(
  { _id: credentials._id },
  { $addToSet: { formationExpoTokenList: payload.formationExpoToken } }
);

exports.removeExpoToken = async (expoToken, credentials) => User.updateOne(
  { _id: credentials._id },
  { $pull: { formationExpoTokenList: expoToken } }
);
