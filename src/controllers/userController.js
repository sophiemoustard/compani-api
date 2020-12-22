const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const UsersHelper = require('../helpers/users');
const {
  getUsersList,
  getUsersListWithSectorHistories,
  getLearnerList,
  createAndSaveFile,
  getUser,
  userExists,
} = require('../helpers/users');

const { language } = translate;

const authenticate = async (req, h) => {
  try {
    const authentication = await UsersHelper.authenticate(req.payload);
    req.log('info', `${req.payload.email} connected`);

    return h.response({
      message: translate[language].userAuthentified,
      data: { ...authentication },
    }).state('alenvi_token', authentication.token)
      .state('refresh_token', authentication.refreshToken)
      .state('user_id', authentication.user._id);
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

/**
 * From MOBILE, refreshToken is in the payload
 * From WEBAPP, refresh_token is in the state
 */
const refreshToken = async (req, h) => {
  try {
    const token = await UsersHelper.refreshToken(get(req, 'payload.refreshToken') || get(req, 'state.refresh_token'));

    return h.response({
      message: translate[language].userAuthentified,
      data: { ...token },
    }).state('alenvi_token', token.token)
      .state('refresh_token', token.refreshToken)
      .state('user_id', token.user._id);
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const logout = async (req, h) => {
  try {
    return h.response({ message: translate[language].userAuthentified })
      .unstate('alenvi_token')
      .unstate('refresh_token')
      .unstate('user_id');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createPasswordToken = async (req) => {
  try {
    const passwordToken = await UsersHelper.createPasswordToken(req.payload.email);

    return {
      message: translate[language].resetPasswordTokenFound,
      data: { passwordToken },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const forgotPassword = async (req) => {
  try {
    const mailInfo = await UsersHelper.forgotPassword(req.payload.email);

    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const checkResetPasswordToken = async (req, h) => {
  try {
    const token = await UsersHelper.checkResetPasswordToken(req.params.token);

    return h.response({ message: translate[language].resetPasswordTokenFound, data: { ...token } })
      .state('alenvi_token', token.token);
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
    const users = await getUsersListWithSectorHistories(req.query, req.auth.credentials);

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

const learnerList = async (req) => {
  try {
    const users = await getLearnerList(req.query, req.auth.credentials);

    return {
      message: users.length === 0 ? translate[language].usersNotFound : translate[language].userFound,
      data: { users },
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

const exists = async (req) => {
  try {
    const userInfo = await userExists(req.query.email, req.auth.credentials);

    return {
      message: translate[language].userFound,
      data: userInfo,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await UsersHelper.updateUser(
      req.params._id,
      req.payload,
      req.auth.credentials,
      req.pre.canEditWithoutCompany
    );

    return { message: translate[language].userUpdated };
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

const updatePassword = async (req) => {
  try {
    const updatedUser = await UsersHelper.updatePassword(req.params._id, req.payload);

    return {
      message: translate[language].userUpdated,
      data: { updatedUser },
    };
  } catch (e) {
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

const removeHelper = async (req) => {
  try {
    await UsersHelper.removeHelper(req.pre.user);

    return { message: translate[language].userRemoved };
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

const uploadPicture = async (req) => {
  try {
    await UsersHelper.uploadPicture(req.params._id, req.payload);

    return { message: translate[language].userUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const deletePicture = async (req) => {
  try {
    await UsersHelper.deletePicture(req.params._id, req.pre.publicId);

    return { message: translate[language].userUpdated };
  } catch (e) {
    if (e.upload && e.code === 404) return { message: translate[language].userUpdated };

    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createDriveFolder = async (req) => {
  try {
    await UsersHelper.createDriveFolder(req.pre.user);

    return { message: translate[language].userUpdated };
  } catch (e) {
    req.log('error', e);
    if (e.output && e.output.statusCode === 424) {
      return Boom.failedDependency(translate[language].googleDriveFolderCreationFailed);
    }

    if (e.output && e.output.statusCode === 404) return Boom.notFound(translate[language].googleDriveFolderNotFound);

    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  authenticate,
  logout,
  create,
  createPasswordToken,
  list,
  listWithSectorHistories,
  activeList,
  learnerList,
  show,
  exists,
  update,
  removeHelper,
  refreshToken,
  forgotPassword,
  checkResetPasswordToken,
  updateCertificates,
  uploadFile,
  uploadPicture,
  deletePicture,
  createDriveFolder,
  updatePassword,
};
