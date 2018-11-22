const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const flat = require('flat');
const _ = require('lodash');
const Boom = require('boom');
const nodemailer = require('nodemailer');
const moment = require('moment');
const mongoose = require('mongoose');

const { clean } = require('../helpers/clean');
const { populateRole } = require('../helpers/populateRole');
const { sendGridTransporter, testTransporter } = require('../helpers/nodemailer');
const { userUpdateTracking } = require('../helpers/userUpdateTracking');
const translate = require('../helpers/translate');
const tokenProcess = require('../helpers/tokenProcess');
const { handleFile } = require('../helpers/gdriveStorage');
const { dissociateEmployeeFromService } = require('../helpers/dissociateEmployeeFromService');

const { language } = translate;

const User = require('../models/User');
const Role = require('../models/Role');
const Task = require('../models/Task');
const drive = require('../models/GoogleDrive');
const cloudinary = require('../models/Cloudinary');

// Authenticate the user locally
const authenticate = async (req) => {
  try {
    const alenviUser = await User.findOne({ 'local.email': req.payload.email.toLowerCase() });
    if (!alenviUser) {
      return Boom.notFound();
    }
    // Check if user is allowed to (re)connect
    if (!alenviUser.refreshToken) {
      return Boom.forbidden();
    }
    // check if password matches
    if (!await bcrypt.compare(req.payload.password, alenviUser.local.password)) {
      return Boom.unauthorized();
    }
    const payload = {
      _id: alenviUser._id.toHexString(),
      role: alenviUser.role.name,
    };
    const user = clean(payload);
    const expireTime = process.env.NODE_ENV === 'development' && payload.role === 'Admin' ? 86400 : 3600;
    const token = tokenProcess.encode(user, expireTime);
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

// Create a new user
const create = async (req) => {
  // Check if users mandatory fields are missing
  try {
    // Create refreshToken and store it
    req.payload.refreshToken = uuidv4();
    // req.payload.company = 'Alenvi';
    const user = new User(req.payload);
    // Save user
    await user.saveByParams(_.pick(req.payload, ['role', 'company']));
    const leanUser = user;
    // Add tasks + drive (auxiliary) folder to newly created user
    const tasks = await Task.find({});
    const taskIds = tasks.map(task => ({ task: task._id }));
    const populatedUser = await User.findOneAndUpdate({ _id: leanUser._id }, { $push: { procedure: { $each: taskIds } } }, { new: true });
    populatedUser.role.rights = populateRole(populatedUser.role.rights, { onlyGrantedRights: true });
    const payload = {
      _id: populatedUser._id.toHexString(),
      role: populatedUser.role,
    };
    const userPayload = _.pickBy(payload);
    const expireTime = 3600;
    const token = tokenProcess.encode(userPayload, expireTime);
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

// Show all user
const list = async (req) => {
  if (req.query.role) {
    req.query.role = await Role.findOne({ name: req.query.role }, { _id: 1 }).lean();
    if (!req.query.role) {
      return Boom.notFound(translate[language].roleNotFound);
    }
  }
  if (req.query.email) {
    req.query.local = { email: req.query.email };
    delete req.query.email;
  }
  const params = _.pickBy(req.query);
  // We populate the user with role data and then we populate the role with rights data
  const users = await User.find(params, {
    planningModification: 0,
    historyChanges: 0,
    features: 0,
  }, { autopopulate: false })
    .populate({
      path: 'procedure.task',
      select: 'name'
    });
  if (users.length === 0) {
    return Boom.notFound(translate[language].userShowAllNotFound);
  }
  // we can't use lean as it doesn't work well with deep populate so we have to use this workaround to get an array of js objects and not mongoose docs.
  // users = users.map((user) => {
  //   user = user.toObject();
  //   if (user.role && user.role.rights.length > 0) {
  //     user.role.rights = populateRole(user.role.rights, { onlyGrantedRights: true });
  //   }
  //   return user;
  // });
  return {
    message: translate[language].userShowAllFound,
    data: {
      users
    }
  };
};

// Find an user by Id in param URL
const show = async (req) => {
  try {
    let user = await User.findOne({ _id: req.params._id });
    if (!user) {
      return Boom.notFound(translate[language].userNotFound);
    }
    user = user.toObject();
    if (user.role && user.role.rights.length > 0) {
      user.role.rights = populateRole(user.role.rights, { onlyGrantedRights: true });
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

// Update an user by id
const update = async (req) => {
  try {
    let role = null;
    if (req.payload.role) {
      role = await Role.findOne({ name: req.payload.role });
      if (!role) {
        return Boom.notFound(translate[language].roleNotFound);
      }
      req.payload.role = role._id.toString();
    }
    // const newBody = clean(flat(req.payload)); no need of clean as Joi prevents falsy values
    const newBody = flat(req.payload);
    // User update tracking
    // const trackingPayload = userUpdateTracking(req.auth.credentials._id, newBody);
    // Have to update using flat package because of mongoDB object dot notation, or it'll update the whole 'local' object (not partially, so erase "email" for example if we provide only "password")
    // const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $set: newBody, $push: { historyChanges: trackingPayload } }, { new: true });
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $set: newBody }, { new: true });
    if (!userUpdated) {
      return Boom.notFound(translate[language].userNotFound);
    }
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

// Update an user certificates
const updateCertificates = async (req) => {
  try {
    delete req.payload._id;
    // const newBody = flat(req.payload);
    // User update tracking
    const trackingPayload = userUpdateTracking(req.auth.credentials._id, req.payload);
    // Have to update using flat package because of mongoDB object dot notation, or it'll update the whole 'local' object (not partially, so erase "email" for example if we provide only "password")
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $pull: req.payload, $push: { historyChanges: trackingPayload } }, { new: true });
    if (!userUpdated) {
      return Boom.notFound(translate[language].userNotFound);
    }
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

// Remove an user by param id
const remove = async (req) => {
  try {
    const userDeleted = await User.findByIdAndRemove({ _id: req.params._id });
    if (!userDeleted) {
      return Boom.notFound(translate[language].userNotFound);
    }
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
    const users = await User.find(payload, {
      _id: 0, firstname: 1, lastname: 1, role: 1, picture: 1, youtube: 1
    });
    if (users.length === 0) {
      return Boom.notFound(translate[language].userShowAllNotFound);
    }
    return {
      message: translate[language].userShowAllFound,
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
    const tasks = await User.findOneAndUpdate(
      { _id: req.params.user_id, 'procedure.task': req.params.task_id },
      { $set: { 'procedure.$.check': req.payload } },
      { new: true }
    ).select('procedure');
    return {
      data: { tasks }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

// Refresh token
const refreshToken = async (req) => {
  try {
    const user = await User.findOne({ refreshToken: req.payload.refreshToken });
    if (!user) {
      return Boom.notFound(translate[language].refreshTokenNotFound);
    }
    const payload = {
      _id: user._id,
      role: user.role.name,
    };
    const userPayload = _.pickBy(payload);
    const expireTime = 3600;
    const token = tokenProcess.encode(userPayload, expireTime);
    // return the information including token as JSON
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
    if (!user) {
      return Boom.notFound(translate[language].userNotFound);
    }
    const mailOptions = {
      from: 'support@alenvi.io', // sender address
      to: req.payload.email, // list of receivers
      subject: 'Changement de mot de passe de votre compte Compani', // Subject line
      html: `<p>Bonjour,</p>
             <p>Vous pouvez modifier votre mot de passe en cliquant sur le lien suivant (lien valable une heure) :</p>
             <p><a href="${process.env.WEBSITE_HOSTNAME}/resetPassword/${payload.resetPassword.token}">${process.env.WEBSITE_HOSTNAME}/resetPassword/${payload.resetPassword.token}</a></p>
             <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ne pas tenir compte de cet email.</p>
             <p>Bien cordialement,<br>
                L'équipe Compani</p>` // html body
    };
    const mailInfo = process.env.NODE_ENV !== 'test' ? await sendGridTransporter.sendMail(mailOptions) : await testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);
    // console.log(nodemailer.getTestMessageUrl(mailInfo)); // see email preview with test account
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
    if (!user) {
      return Boom.notFound(translate[language].resetPasswordTokenNotFound);
    }
    const payload = {
      _id: user._id,
      email: user.local.email,
      role: user.role.name,
      from: user.resetPassword.from
    };
    const userPayload = _.pickBy(payload);
    const expireTime = 3600;
    const token = tokenProcess.encode(userPayload, expireTime);
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
      Boom.forbidden('Upload not allowed');
    }
    if (administrativeKeys[0] === 'signedContract' || administrativeKeys[0] === 'signedVersion') {
      if (!req.payload.contractId && !req.payload.versionId) {
        return Boom.badRequest();
      }
    }
    const uploadedFile = await handleFile({
      driveFolderId: req.params.driveId,
      name: req.payload.fileName || req.payload[administrativeKeys[0]].hapi.filename,
      type: req.payload['Content-Type'],
      body: req.payload[administrativeKeys[0]]
    });
    let driveFileInfo = null;
    try {
      driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });
    } catch (e) {
      req.log(['error', 'gdrive'], e);
    }
    if (administrativeKeys[0] === 'certificates') {
      const payload = {
        'administrative.certificates': {
          driveId: uploadedFile.id,
          link: driveFileInfo.webViewLink,
          // thumbnailLink: driveFileInfo.thumbnailLink
        }
      };
      await User.findOneAndUpdate({ _id: req.params._id }, { $push: payload }, { new: true, autopopulate: false });
    } else if (administrativeKeys[0] === 'absenceReason') {
      const payload = {
        'administrative.absences.$': {
          driveId: uploadedFile.id,
          link: driveFileInfo.webViewLink,
        }
      };
      await User.findOneAndUpdate({ _id: req.params._id, 'administrative.absences._id': req.payload.absenceId }, { $set: flat(payload) }, { new: true });
    } else if (administrativeKeys[0] === 'signedContract' || administrativeKeys[0] === 'signedVersion') {
      const payload = {
        'administrative.contracts.$[contract].versions.$[version]': {
          driveId: uploadedFile.id,
          link: driveFileInfo.webViewLink,
        }
      };
      await User.findOneAndUpdate({ _id: req.params._id, }, { $set: flat(payload) }, {
        new: true,
        arrayFilters: [{ 'contract._id': mongoose.Types.ObjectId(req.payload.contractId) }, { 'version._id': mongoose.Types.ObjectId(req.payload.versionId) }],
        autopopulate: false
      });
    } else {
      const payload = {
        administrative: {
          [administrativeKeys[0]]: {
            driveId: uploadedFile.id,
            link: driveFileInfo.webViewLink,
            // thumbnailLink: driveFileInfo.thumbnailLink
          }
        }
      };
      await User.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true, autopopulate: false });
    }
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
    return { message: translate[language].fileCreated, data: { picture: payload.picture, userUpdated } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const createDriveFolder = async (req) => {
  try {
    const user = await User.findOne({ _id: req.params._id });
    let folderPayload = {};
    let updatedUser;
    if (user.firstname && user.lastname) {
      const folder = await drive.add({
        name: `${user.lastname.toUpperCase()} ${user.firstname}`,
        parentFolderId: req.payload.parentFolderId || process.env.GOOGLE_DRIVE_AUXILIARIES_FOLDER_ID,
        folder: true
      });
      if (!folder) {
        req.log('error', 'Google drive folder creation failed.');
        return Boom.failedDependency('Google drive folder creation failed.');
      }
      const folderLink = await drive.getFileById({ fileId: folder.id });
      if (!folderLink) {
        req.log('error', 'Google drive folder creation failed.');
        return Boom.notFound('Google drive folder not found.');
      }
      if (user.administrative) {
        folderPayload.administrative = user.administrative;
        folderPayload.administrative.driveFolder = {
          id: folder.id,
          link: folderLink.webViewLink
        };
      } else {
        folderPayload = {
          administrative: {
            driveFolder: {
              id: folder.id,
              link: folderLink.webViewLink
            }
          }
        };
      }
      updatedUser = await User.findOneAndUpdate({ _id: user._id }, { $set: folderPayload }, { new: true, autopopulate: false });
    }
    return {
      message: translate[language].userUpdated,
      data: { updatedUser }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getUserContracts = async (req) => {
  try {
    const contracts = await User.findOne({
      _id: req.params._id,
      'administrative.contracts': { $exists: true }
    }, {
      firstname: 1,
      lastname: 1,
      'administrative.contracts': 1
    }, { autopopulate: false }).lean();
    return {
      message: translate[language].userContractsFound,
      data: {
        user: _.pick(contracts, ['_id', 'firstname', 'lastname']),
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
    let payload;
    let endContract = false;
    if (req.payload.endDate) {
      payload = {
        'administrative.contracts.$[contract]': {
          endDate: req.payload.endDate,
          'versions.$[version]': { isActive: false, endDate: req.payload.endDate }
        }
      };
      endContract = true;
    } else {
      payload = { 'administrative.contracts.$': { ...req.payload } };
    }
    const contractUpdated = await User.findOneAndUpdate({
      _id: req.params._id,
      'administrative.contracts._id': req.params.contractId
    }, { $set: flat(payload) }, {
      new: true,
      arrayFilters: endContract ? [{ 'contract._id': mongoose.Types.ObjectId(req.params.contractId) }, { 'version.isActive': { $eq: true } }] : [],
      select: {
        firstname: 1,
        lastname: 1,
        employee_id: 1,
        'administrative.contracts': 1
      },
      autopopulate: false
    }).lean();
    if (!contractUpdated) {
      return Boom.notFound(translate[language].contractNotFound);
    }
    if (endContract) {
      await dissociateEmployeeFromService({ from: req.payload.endDate, id_employee: contractUpdated.id_employee });
    }
    return {
      message: translate[language].userContractUpdated,
      data: {
        user: _.pick(contractUpdated, ['_id', 'firstname', 'lastname']),
        contracts: contractUpdated.administrative.contracts.find(contract => contract._id.toHexString() === req.params.contractId)
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
    const newContract = await User.findOneAndUpdate({ _id: req.params._id }, { $push: { 'administrative.contracts': req.payload } }, {
      new: true,
      select: {
        firstname: 1,
        lastname: 1,
        'administrative.contracts': 1
      },
      autopopulate: false
    });
    return {
      message: translate[language].userContractAdded,
      data: {
        user: _.pick(newContract, ['_id', 'firstname', 'lastname']),
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
    await User.findOneAndUpdate({ _id: req.params._id }, { $pull: { 'administrative.contracts': { _id: req.params.contractId } } }, {
      select: {
        firstname: 1,
        lastname: 1,
        administrative: 1
      },
      autopopulate: false
    });
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
    const newContract = await User.findOneAndUpdate({
      _id: req.params._id,
      'administrative.contracts._id': req.params.contractId
    }, { $push: { 'administrative.contracts.$.versions': req.payload } }, {
      new: true,
      select: {
        firstname: 1,
        lastname: 1,
        administrative: 1
      },
      autopopulate: false
    });
    return { message: translate[language].userContractVersionAdded, data: { contract: newContract } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateUserContractVersion = async (req) => {
  try {
    const payload = { 'administrative.contracts.$[contract].versions.$[version]': { ...req.payload } };
    const updatedVersion = await User.findOneAndUpdate({
      _id: req.params._id,
    }, { $set: flat(payload) }, {
      // Conversion to objectIds is mandatory as we use directly mongo arrayFilters
      arrayFilters: [{ 'contract._id': mongoose.Types.ObjectId(req.params.contractId) }, { 'version._id': mongoose.Types.ObjectId(req.params.versionId) }],
      new: true,
      autopopulate: false,
      firstname: 1,
      lastname: 1,
      'administrative.contracts': 1
    });
    return {
      message: translate[language].userContractVersionUpdated,
      data: {
        user: _.pick(updatedVersion, ['_id', 'firstname', 'lastname']),
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
    await User.findOneAndUpdate({
      _id: req.params._id,
      'administrative.contracts._id': req.params.contractId,
    }, { $pull: { 'administrative.contracts.$.versions': { _id: req.params.versionId } } }, {
      select: {
        firstname: 1,
        lastname: 1,
        administrative: 1
      },
      autopopulate: true
    });
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
    const user = await User.findOne({ _id: req.params._id, }, {
      firstname: 1,
      lastname: 1,
      'administrative.absences': 1
    }, { autopopulate: false }).lean();
    return {
      message: translate[language].userAbsencesFound,
      data: {
        user: _.pick(user, ['_id', 'firstname', 'lastname']),
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
    const absenceUpdated = await User.findOneAndUpdate({
      _id: req.params._id,
      'administrative.absences._id': req.params.absenceId
    }, { $set: flat(payload) }, {
      new: true,
      select: {
        firstname: 1,
        lastname: 1,
        employee_id: 1,
        'administrative.absences': 1
      }
    }).lean();
    if (!absenceUpdated) {
      return Boom.notFound(translate[language].absenceNotFound);
    }
    return {
      message: translate[language].userAbsenceUpdated,
      data: {
        user: _.pick(absenceUpdated, ['_id', 'firstname', 'lastname']),
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
    const newAbsence = await User.findOneAndUpdate({ _id: req.params._id }, { $push: { 'administrative.absences': req.payload } }, {
      new: true,
      select: {
        firstname: 1,
        lastname: 1,
        'administrative.absences': 1
      },
      autopopulate: false
    });
    return {
      message: translate[language].userAbsenceAdded,
      data: {
        user: _.pick(newAbsence, ['_id', 'firstname', 'lastname']),
        absences: newAbsence.administrative.absences
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeUserAbsence = async (req) => {
  try {
    await User.findOneAndUpdate({ _id: req.params._id }, { $pull: { 'administrative.absences': { _id: req.params.absenceId } } }, {
      select: {
        firstname: 1,
        lastname: 1,
        administrative: 1
      },
      autopopulate: false
    });
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
  show,
  update,
  remove,
  getPresentation,
  refreshToken,
  forgotPassword,
  checkResetPasswordToken,
  updateCertificates,
  updateTask,
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
  removeUserAbsence
};
