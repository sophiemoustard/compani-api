const flat = require('flat');
const _ = require('lodash');
const Boom = require('boom');
const nodemailer = require('nodemailer');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
const { sendinBlueTransporter, testTransporter } = require('../helpers/nodemailer');
const translate = require('../helpers/translate');
const { encode } = require('../helpers/authentication');
const GdriveStorageHelper = require('../helpers/gdriveStorage');
const { forgetPasswordEmail } = require('../helpers/emailOptions');
const UsersHelper = require('../helpers/users');
const { getUsersList, getUsersListWithSectorHistories, createAndSaveFile, getUser } = require('../helpers/users');
const { AUXILIARY, SENDER_MAIL } = require('../helpers/constants');
const User = require('../models/User');
const cloudinary = require('../models/Cloudinary');

const { language } = translate;

const authenticate = async (req) => {
  try {
    const authentication = await UsersHelper.authenticate(req.payload);
    req.log('info', `${req.payload.email} connected`);

    return {
      message: translate[language].userAuthentified,
      data: { ...authentication },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const refreshToken = async (req) => {
  try {
    const token = await UsersHelper.refreshToken(req.payload);

    return {
      message: translate[language].userAuthentified,
      data: { ...token },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const newUser = await UsersHelper.createUser(req.payload, req.auth.credentials);

    return {
      message: translate[language].userSaved,
      data: { user: newUser },
    };
  } catch (e) {
    // Error code when there is a duplicate key, in this case : the email (unique field)
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].userEmailExists);
    }
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const users = await getUsersList(req.query, req.auth.credentials);

    return {
      message: users.length === 0 ? translate[language].usersNotFound : translate[language].userFound,
      data: { users },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const listWithSectorHistories = async (req) => {
  try {
    const users = await getUsersListWithSectorHistories(req.auth.credentials);

    return {
      message: users.length === 0 ? translate[language].usersNotFound : translate[language].userFound,
      data: { users },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const activeList = async (req) => {
  try {
    const users = await getUsersList(req.query, req.auth.credentials);
    const activeUsers = users.filter(user => user.isActive);

    return {
      message: users.length === 0 ? translate[language].usersNotFound : translate[language].userFound,
      data: { users: activeUsers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const show = async (req) => {
  try {
    const user = await getUser(req.params._id, req.auth.credentials);

    return {
      message: translate[language].userFound,
      data: { user },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const updatedUser = await UsersHelper.updateUser(req.params._id, req.payload, req.auth.credentials);

    return {
      message: translate[language].userUpdated,
      data: { updatedUser },
    };
  } catch (e) {
    // Error code when there is a duplicate key, in this case : the email (unique field)
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].userEmailExists);
    }
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateCertificates = async (req) => {
  try {
    await UsersHelper.updateUserCertificates(req.params._id, req.payload, req.auth.credentials);

    return { message: translate[language].userUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await User.findByIdAndRemove(req.params._id);

    return { message: translate[language].userRemoved };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const updateTask = async (req) => {
  try {
    req.payload.at = Date.now();
    const tasks = await User
      .findOneAndUpdate(
        { _id: req.params._id, 'procedure.task': req.params.task_id },
        { $set: { 'procedure.$.check': req.payload } },
        { new: true }
      )
      .select('procedure');

    return {
      message: translate[language].userTaskUpdated,
      data: { tasks },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getUserTasks = async (req) => {
  try {
    const user = await User.findOne(
      { _id: req.params._id, procedure: { $exists: true } },
      { identity: 1, procedure: 1 }
    ).populate({ path: 'procedure.task', select: 'name _id' }).lean();

    if (!user) return Boom.notFound();

    return {
      message: translate[language].userTasksFound,
      data: {
        user: _.pick(user, ['_id', 'identity']),
        tasks: user.procedure,
      },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const forgotPassword = async (req) => {
  try {
    const payload = {
      resetPassword: {
        token: uuidv4(),
        expiresIn: Date.now() + 3600000, // 1 hour
        from: req.payload.from,
      },
    };
    const user = await User.findOneAndUpdate({ 'local.email': req.payload.email }, { $set: payload }, { new: true });
    if (!user) return Boom.notFound(translate[language].userNotFound);

    const mailOptions = {
      from: `Compani <${SENDER_MAIL}>`,
      to: req.payload.email,
      subject: 'Changement de mot de passe de votre compte Compani',
      html: forgetPasswordEmail(payload.resetPassword),
    };
    const mailInfo = process.env.NODE_ENV !== 'test'
      ? await sendinBlueTransporter().sendMail(mailOptions)
      : await testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);

    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const checkResetPasswordToken = async (req) => {
  try {
    const filter = {
      resetPassword: {
        token: req.params.token,
        expiresIn: { $gt: Date.now() },
      },
    };
    const user = await User.findOne(flat(filter, { maxDepth: 2 }));
    if (!user) return Boom.notFound(translate[language].resetPasswordTokenNotFound);

    const payload = {
      _id: user._id,
      email: user.local.email,
      role: user.role.name,
      from: user.resetPassword.from,
    };
    const userPayload = _.pickBy(payload);
    const expireTime = 86400;
    const token = encode(userPayload, expireTime);
    // return the information including token as JSON
    return { message: translate[language].resetPasswordTokenFound, data: { token, user: userPayload } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const uploadFile = async (req) => {
  try {
    const uploadedFile = await createAndSaveFile(req.params, req.payload);
    return { message: translate[language].fileCreated, data: { uploadedFile } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const uploadImage = async (req) => {
  try {
    const pictureUploaded = await cloudinary.addImage({
      file: req.payload.picture,
      role: req.payload.role || AUXILIARY,
      public_id: `${req.payload.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`,
    });
    const payload = {
      picture: {
        publicId: pictureUploaded.public_id,
        link: pictureUploaded.secure_url,
      },
    };
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true });

    return {
      message: translate[language].fileCreated,
      data: { picture: payload.picture, userUpdated },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createDriveFolder = async (req) => {
  try {
    const user = await User.findById(req.params._id);
    let updatedUser;

    if (user.identity.firstname && user.identity.lastname) {
      const parentFolderId = req.payload.parentFolderId || process.env.GOOGLE_DRIVE_AUXILIARIES_FOLDER_ID;
      const folder = await GdriveStorageHelper.createFolder(user.identity, parentFolderId);

      const folderPayload = {};
      folderPayload.administrative = user.administrative || { driveFolder: {} };
      folderPayload.administrative.driveFolder = {
        driveId: folder.id,
        link: folder.webViewLink,
      };

      updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        { $set: folderPayload },
        { new: true, autopopulate: false }
      );
    }

    return {
      message: translate[language].userUpdated,
      data: { updatedUser },
    };
  } catch (e) {
    req.log('error', e);
    if (e.output && e.output.statusCode === 424) {
      return Boom.failedDependency(translate[language].googleDriveFolderCreationFailed);
    }

    if (e.output && e.output.statusCode === 404) {
      return Boom.notFound(translate[language].googleDriveFolderNotFound);
    }

    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  authenticate,
  create,
  list,
  listWithSectorHistories,
  activeList,
  show,
  update,
  remove,
  refreshToken,
  forgotPassword,
  checkResetPasswordToken,
  updateCertificates,
  updateTask,
  getUserTasks,
  uploadFile,
  uploadImage,
  createDriveFolder,
};
