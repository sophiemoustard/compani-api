const Boom = require('@hapi/boom');
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

const forgotPassword = async (req) => {
  try {
    const mailInfo = await UsersHelper.forgotPassword(req.payload.email);

    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const checkResetPasswordToken = async (req) => {
  try {
    const token = await UsersHelper.checkResetPasswordToken(req.params.token);

    return { message: translate[language].resetPasswordTokenFound, data: { ...token } };
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

    return { message: translate[language].fileCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const deletePicture = async (req) => {
  try {
    await UsersHelper.deletePicture(req.params._id, req.pre.publicId);

    return { message: translate[language].cardUpdated };
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
