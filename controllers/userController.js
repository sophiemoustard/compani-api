const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const flat = require('flat');
const _ = require('lodash');
const Boom = require('boom');
const nodemailer = require('nodemailer');
const moment = require('moment');
const mongoose = require('mongoose');

const { clean } = require('../helpers/utils');
const { populateRole } = require('../helpers/roles');
const { sendGridTransporter, testTransporter } = require('../helpers/nodemailer');
const { userUpdateTracking } = require('../helpers/userUpdateTracking');
const translate = require('../helpers/translate');
const { encode } = require('../helpers/authentification');
const { createFolder } = require('../helpers/gdriveStorage');
const { endUserContract, updateContract } = require('../helpers/userContracts');
const { forgetPasswordEmail } = require('../helpers/emailOptions');
const { getUsers, createAndSaveFile } = require('../helpers/users');
const { isUsedInFundings } = require('../helpers/thirdPartyPayers');
const User = require('../models/User');
const Role = require('../models/Role');
const Task = require('../models/Task');
const cloudinary = require('../models/Cloudinary');

const { language } = translate;

const authenticate = async (req) => {
  try {
    const alenviUser = await User.findOne({ 'local.email': req.payload.email.toLowerCase() });
    if (!alenviUser) return Boom.notFound();

    if (!alenviUser.refreshToken) return Boom.forbidden();

    if (!await bcrypt.compare(req.payload.password, alenviUser.local.password)) {
      return Boom.unauthorized();
    }

    const payload = { _id: alenviUser._id.toHexString(), role: alenviUser.role.name };
    const user = clean(payload);
    const expireTime = 86400;
    const token = encode(user, expireTime);
    const { refreshToken } = alenviUser;
    req.log('info', `${req.payload.email} connected`);

    return {
      message: translate[language].userAuthentified,
      data: {
        token, refreshToken, expiresIn: expireTime, user
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    req.payload.refreshToken = uuidv4();
    const user = new User(req.payload);
    await user.saveByParams(_.pick(req.payload, ['role', 'company']));
    const leanUser = user;
    const tasks = await Task.find({});
    const taskIds = tasks.map(task => ({ task: task._id }));
    const populatedUser = await User.findOneAndUpdate({ _id: leanUser._id }, { $push: { procedure: { $each: taskIds } } }, { new: true });
    populatedUser.role.rights = populateRole(populatedUser.role.rights, { onlyGrantedRights: true });
    const payload = {
      _id: populatedUser._id.toHexString(),
      role: populatedUser.role,
    };
    const userPayload = _.pickBy(payload);
    const expireTime = 86400;
    const token = encode(userPayload, expireTime);
    return {
      message: translate[language].userSaved,
      data: {
        token, refreshToken: user.refreshToken, expiresIn: expireTime, user: userPayload
      }
    };
  } catch (e) {
    // Error code when there is a duplicate key, in this case : the email (unique field)
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].userEmailExists);
    } else if (e.name === 'NoRole') {
      req.log(['error', 'db'], e);
      return Boom.notFound(translate[language].roleNotFound);
    }
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const list = async (req) => {
  try {
    const users = await getUsers(req.query);
    if (users.length === 0) {
      return {
        message: translate[language].usersNotFound,
        data: { users: [] },
      };
    }

    return {
      message: translate[language].userFound,
      data: { users }
    };
  } catch (e) {
    req.log('error', e);
    if (Boom.isBoom(e)) return e;
    return Boom.badImplementation();
  }
};

const activeList = async (req) => {
  try {
    const users = await getUsers(req.query);
    if (users.length === 0) {
      return {
        message: translate[language].usersNotFound,
        data: { users: [] }
      };
    }

    const activeUsers = users.filter(user => user.isActive);

    return {
      message: translate[language].userFound,
      data: { users: activeUsers }
    };
  } catch (e) {
    req.log('error', e);
    if (Boom.isBoom(e)) return e;
    return Boom.badImplementation();
  }
};

const show = async (req) => {
  try {
    let user = await User.findOne({ _id: req.params._id }).populate('customers');
    if (!user) return Boom.notFound(translate[language].userNotFound);

    user = user.toObject();
    if (user.role && user.role.rights.length > 0) {
      user.role.rights = populateRole(user.role.rights, { onlyGrantedRights: true });
    }

    if (user.company && user.company.customersConfig && user.company.customersConfig.thirdPartyPayers) {
      user.company.customersConfig.thirdPartyPayers = await isUsedInFundings(user.company.customersConfig.thirdPartyPayers);
    }

    return {
      message: translate[language].userFound,
      data: { user }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};


const update = async (req) => {
  try {
    const newBody = flat(req.payload);
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $set: newBody }, { new: true });
    if (!userUpdated) return Boom.notFound(translate[language].userNotFound);

    if (userUpdated.role && userUpdated.role.rights.length > 0) {
      userUpdated.role.rights = populateRole(userUpdated.role.rights, { onlyGrantedRights: true });
    }

    return {
      message: translate[language].userUpdated,
      data: { userUpdated }
    };
  } catch (e) {
    // Error code when there is a duplicate key, in this case : the email (unique field)
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].userEmailExists);
    }
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateCertificates = async (req) => {
  try {
    delete req.payload._id;
    const trackingPayload = userUpdateTracking(req.auth.credentials._id, req.payload);
    // Have to update using flat package because of mongoDB object dot notation, or it'll update the whole 'local' object (not partially, so erase "email" for example if we provide only "password")
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $pull: req.payload, $push: { historyChanges: trackingPayload } }, { new: true });
    if (!userUpdated) return Boom.notFound(translate[language].userNotFound);

    if (userUpdated.role && userUpdated.role.rights.length > 0) {
      userUpdated.role.rights = populateRole(userUpdated.role.rights, { onlyGrantedRights: true });
    }
    return {
      message: translate[language].userUpdated,
      data: { userUpdated }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const userDeleted = await User.findByIdAndRemove({ _id: req.params._id });
    if (!userDeleted) return Boom.notFound(translate[language].userNotFound);

    return {
      message: translate[language].userRemoved,
      data: { userDeleted }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

// Get all users presentation for alenvi.io (youtube + picture)
const getPresentation = async (req) => {
  try {
    const params = {
      'youtube.location': _.isArray(req.query.location) ? { $in: req.query.location } : req.query.location,
      role: _.isArray(req.query.role) ? { $in: req.query.role } : req.query.role
    };
    const roleIds = await Role.find({ name: params.role }, { _id: 1 });
    params.role = { $in: roleIds };
    const payload = _.pickBy(params);
    const users = await User.find(
      payload,
      {
        _id: 0, identity: 1, role: 1, picture: 1, youtube: 1,
      }
    );
    if (users.length === 0) return Boom.notFound(translate[language].usersNotFound);

    return {
      message: translate[language].usersFound,
      data: { users }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateTask = async (req) => {
  try {
    req.payload.at = Date.now();
    const tasks = await User
      .findOneAndUpdate(
        { _id: req.params.user_id, 'procedure.task': req.params.task_id },
        { $set: { 'procedure.$.check': req.payload } },
        { new: true }
      )
      .select('procedure');
    return {
      data: { tasks }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getUserTasks = async (req) => {
  try {
    const tasks = await User.findOne(
      { _id: req.params._id, procedure: { $exists: true }, },
      { identity: 1, procedure: 1 }
    );

    if (!tasks) return Boom.notFound();

    return {
      message: translate[language].userTasksFound,
      data: {
        user: _.pick(tasks, ['_id', 'identity']),
        tasks: tasks.procedure,
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const refreshToken = async (req) => {
  try {
    const user = await User.findOne({ refreshToken: req.payload.refreshToken });
    if (!user) return Boom.notFound(translate[language].refreshTokenNotFound);

    const payload = { _id: user._id, role: user.role.name };
    const userPayload = _.pickBy(payload);
    const expireTime = 86400;
    const token = encode(userPayload, expireTime);

    return {
      message: translate[language].userAuthentified,
      data: {
        token, refreshToken: user.refreshToken, expiresIn: expireTime, user: userPayload
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const forgotPassword = async (req) => {
  try {
    const payload = {
      resetPassword: {
        token: uuidv4(),
        expiresIn: Date.now() + 3600000, // 1 hour
        from: req.payload.from
      }
    };
    const user = await User.findOneAndUpdate({ 'local.email': req.payload.email }, { $set: payload }, { new: true });
    if (!user) return Boom.notFound(translate[language].userNotFound);

    const mailOptions = {
      from: 'support@alenvi.io',
      to: req.payload.email,
      subject: 'Changement de mot de passe de votre compte Compani',
      html: forgetPasswordEmail(payload.resetPassword)
    };
    const mailInfo = process.env.NODE_ENV !== 'test'
      ? await sendGridTransporter.sendMail(mailOptions)
      : await testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);

    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const checkResetPasswordToken = async (req) => {
  try {
    const filter = {
      resetPassword: {
        token: req.params.token,
        expiresIn: { $gt: Date.now() }
      }
    };
    const user = await User.findOne(flat(filter, { maxDepth: 2 }));
    if (!user) return Boom.notFound(translate[language].resetPasswordTokenNotFound);

    const payload = {
      _id: user._id,
      email: user.local.email,
      role: user.role.name,
      from: user.resetPassword.from
    };
    const userPayload = _.pickBy(payload);
    const expireTime = 86400;
    const token = encode(userPayload, expireTime);
    // return the information including token as JSON
    return { message: translate[language].resetPasswordTokenFound, data: { token, user: userPayload } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const uploadFile = async (req) => {
  try {
    const allowedFields = [
      'idCardRecto',
      'idCardVerso',
      'passport',
      'residencePermitRecto',
      'residencePermitVerso',
      'healthAttest',
      'certificates',
      'phoneInvoice',
      'navigoInvoice',
      'transportInvoice',
      'mutualFund',
      'vitalCard',
      'signedContract',
      'signedVersion',
      'medicalCertificate',
      'absenceReason'
    ];
    const administrativeKeys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    if (administrativeKeys.length === 0) {
      return Boom.forbidden(translate[language].uploadNotAllowed);
    }
    if (administrativeKeys[0] === 'signedContract' || administrativeKeys[0] === 'signedVersion') {
      if (!req.payload.contractId && !req.payload.versionId) {
        return Boom.badRequest();
      }
    }

    const uploadedFile = await createAndSaveFile(administrativeKeys, req.params, req.payload);

    return { message: translate[language].fileCreated, data: { uploadedFile } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const uploadImage = async (req) => {
  try {
    const pictureUploaded = await cloudinary.addImage({
      file: req.payload.picture,
      role: req.payload.role || 'Auxiliaire',
      public_id: `${req.payload.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`
    });
    const payload = {
      picture: {
        publicId: pictureUploaded.public_id,
        link: pictureUploaded.secure_url
      }
    };
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true });

    return {
      message: translate[language].fileCreated,
      data: { picture: payload.picture, userUpdated }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const createDriveFolder = async (req) => {
  try {
    const user = await User.findOne({ _id: req.params._id });
    let updatedUser;

    if (user.identity.firstname && user.identity.lastname) {
      const parentFolderId = req.payload.parentFolderId || process.env.GOOGLE_DRIVE_AUXILIARIES_FOLDER_ID;
      const { folder, folderLink } = await createFolder(user.identity, parentFolderId);

      const folderPayload = {};
      folderPayload.administrative = user.administrative || { driveFolder: {} };
      folderPayload.administrative.driveFolder = {
        id: folder.id,
        link: folderLink.webViewLink
      };

      updatedUser = await User.findOneAndUpdate({ _id: user._id }, { $set: folderPayload }, { new: true, autopopulate: false });
    }

    return {
      message: translate[language].userUpdated,
      data: { updatedUser }
    };
  } catch (e) {
    req.log('error', e);
    if (e.output && e.output.statusCode === 424) {
      return Boom.failedDependency(translate[language].googleDriveFolderCreationFailed);
    }

    if (e.output && e.output.statusCode === 404) {
      return Boom.notFound(translate[language].googleDriveFolderNotFound);
    }

    return Boom.badImplementation();
  }
};

const getUserContracts = async (req) => {
  try {
    const contracts = await User.findOne(
      { _id: req.params._id, 'administrative.contracts': { $exists: true } },
      { identity: 1, 'administrative.contracts': 1 },
      { autopopulate: false }
    ).lean();
    if (!contracts) return Boom.notFound();

    return {
      message: translate[language].userContractsFound,
      data: {
        user: _.pick(contracts, ['_id', 'identity']),
        contracts: contracts.administrative.contracts
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateUserContract = async (req) => {
  try {
    let updatedUser;
    if (req.payload.endDate) {
      updatedUser = await endUserContract(req.params, req.payload);
    } else {
      updatedUser = await updateContract(req.params, req.payload);
    }

    if (!updatedUser) return Boom.notFound(translate[language].contractNotFound);

    return {
      message: translate[language].userContractUpdated,
      data: {
        user: _.pick(updatedUser, ['_id', 'identity', 'inactivityDate']),
        contracts: updatedUser.administrative.contracts.find(contract => contract._id.toHexString() === req.params.contractId)
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation();
  }
};

const createUserContract = async (req) => {
  try {
    req.payload.versions = [{
      startDate: req.payload.startDate,
      weeklyHours: req.payload.weeklyHours,
      grossHourlyRate: req.payload.grossHourlyRate,
      ogustContractId: req.payload.ogustContractId
    }];
    const newContract = await User.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { 'administrative.contracts': req.payload }, $set: { inactivityDate: null } },
      {
        new: true,
        select: { identity: 1, 'administrative.contracts': 1 },
        autopopulate: false
      }
    );

    return {
      message: translate[language].userContractAdded,
      data: {
        user: _.pick(newContract, ['_id', 'identity']),
        contracts: newContract.administrative.contracts
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeUserContract = async (req) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params._id },
      { $pull: { 'administrative.contracts': { _id: req.params.contractId } } },
      {
        select: { identity: 1, administrative: 1 },
        autopopulate: false
      }
    );

    if (!user) return Boom.notFound(translate[language].userNotFound);

    return {
      message: translate[language].userContractRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const createUserContractVersion = async (req) => {
  try {
    const newContract = await User.findOneAndUpdate(
      { _id: req.params._id, 'administrative.contracts._id': req.params.contractId },
      { $push: { 'administrative.contracts.$.versions': req.payload } },
      {
        new: true,
        select: { identity: 1, administrative: 1 },
        autopopulate: false
      }
    );

    return { message: translate[language].userContractVersionAdded, data: { contract: newContract } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateUserContractVersion = async (req) => {
  try {
    const payload = { 'administrative.contracts.$[contract].versions.$[version]': { ...req.payload } };
    const updatedVersion = await User.findOneAndUpdate(
      { _id: req.params._id, },
      { $set: flat(payload) },
      {
        // Conversion to objectIds is mandatory as we use directly mongo arrayFilters
        arrayFilters: [
          { 'contract._id': mongoose.Types.ObjectId(req.params.contractId) },
          { 'version._id': mongoose.Types.ObjectId(req.params.versionId) }
        ],
        new: true,
        autopopulate: false,
        identity: 1,
        'administrative.contracts': 1
      }
    );

    return {
      message: translate[language].userContractVersionUpdated,
      data: {
        user: _.pick(updatedVersion, ['_id', 'identity']),
        contracts: updatedVersion.administrative.contracts.find(contract => contract._id.toHexString() === req.params.contractId)
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeUserContractVersion = async (req) => {
  try {
    await User.findOneAndUpdate(
      { _id: req.params._id, 'administrative.contracts._id': req.params.contractId },
      { $pull: { 'administrative.contracts.$.versions': { _id: req.params.versionId } } },
      {
        select: { identity: 1, administrative: 1 },
        autopopulate: true
      }
    );

    return {
      message: translate[language].userContractVersionRemoved,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getUserAbsences = async (req) => {
  try {
    const user = await User.findOne(
      { _id: req.params._id, 'administrative.absences': { $exists: true } },
      { identity: 1, 'administrative.absences': 1 },
      { autopopulate: false }
    ).lean();
    if (!user) return Boom.notFound();

    return {
      message: translate[language].userAbsencesFound,
      data: {
        user: _.pick(user, ['_id', 'identity']),
        absences: user.administrative.absences
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateUserAbsence = async (req) => {
  try {
    const payload = { 'administrative.absences.$': { ...req.payload } };
    const absenceUpdated = await User.findOneAndUpdate(
      { _id: req.params._id, 'administrative.absences._id': req.params.absenceId },
      { $set: flat(payload) },
      {
        new: true,
        select: {
          identity: 1,
          employee_id: 1,
          'administrative.absences': 1
        }
      }
    ).lean();
    if (!absenceUpdated) return Boom.notFound(translate[language].absenceNotFound);

    return {
      message: translate[language].userAbsenceUpdated,
      data: {
        user: _.pick(absenceUpdated, ['_id', 'identity']),
        absences: absenceUpdated.administrative.absences.find(absence => absence._id.toHexString() === req.params.absenceId)
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation();
  }
};

const createUserAbsence = async (req) => {
  try {
    const newAbsence = await User.findOneAndUpdate(
      { _id: req.params._id },
      { $push: { 'administrative.absences': req.payload } },
      {
        new: true,
        select: { identity: 1, 'administrative.absences': 1 },
        autopopulate: false
      }
    );

    return {
      message: translate[language].userAbsenceAdded,
      data: {
        user: _.pick(newAbsence, ['_id', 'identity']),
        absence: newAbsence.administrative.absences.find(absence => absence.reason === req.payload.reason)
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeUserAbsence = async (req) => {
  try {
    await User.findOneAndUpdate(
      { _id: req.params._id },
      { $pull: { 'administrative.absences': { _id: req.params.absenceId } } },
      {
        select: { identity: 1, administrative: 1 },
        autopopulate: false
      }
    );

    return {
      message: translate[language].userAbsenceRemoved
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  authenticate,
  create,
  list,
  activeList,
  show,
  update,
  remove,
  getPresentation,
  refreshToken,
  forgotPassword,
  checkResetPasswordToken,
  updateCertificates,
  updateTask,
  getUserTasks,
  uploadFile,
  uploadImage,
  createDriveFolder,
  getUserContracts,
  updateUserContract,
  createUserContract,
  removeUserContract,
  createUserContractVersion,
  updateUserContractVersion,
  removeUserContractVersion,
  getUserAbsences,
  updateUserAbsence,
  createUserAbsence,
  removeUserAbsence,
};
