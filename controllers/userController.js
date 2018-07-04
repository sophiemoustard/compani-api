const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const flat = require('flat');
const _ = require('lodash');
const Boom = require('boom');
const nodemailer = require('nodemailer');

const { clean } = require('../helpers/clean');
const { populateRole } = require('../helpers/populateRole');
const { sendGridTransporter, testTransporter } = require('../helpers/nodemailer');
const translate = require('../helpers/translate');
const tokenProcess = require('../helpers/tokenProcess');

const { language } = translate;

const User = require('../models/User');
const Role = require('../models/Role');
const Feature = require('../models/Feature');
const drive = require('../models/Uploader/GoogleDrive');

// Authenticate the user locally
const authenticate = async (req) => {
  try {
    const alenviUser = await User.findOne({ 'local.email': req.payload.email.toLowerCase() }).populate({
      path: 'role',
      model: Role,
      populate: {
        path: 'features.feature_id',
        model: Feature
      }
    }).lean();
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
    // return the information including token as JSON
    // return res.status(200).json({ success: true, message: translate[language].userAuthentified, data: { token, user } });
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
    const user = new User(req.payload);
    // Save user
    await user.saveByRoleName(req.payload.role);
    const leanUser = user;
    // Add gdrive folder after save to avoid creating it if duplicate email
    let folderPayload = {};
    if (req.payload.role === 'Auxiliaire' && req.payload.firstname && req.payload.lastname) {
      const folder = await drive.add({
        name: `${req.payload.lastname.toUpperCase()} ${req.payload.firstname}`,
        parentFolderId: process.env.GOOGLE_DRIVE_AUXILIARIES_FOLDER_ID,
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
      if (leanUser.administrative) {
        folderPayload.administrative = leanUser.administrative;
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
    }

    // Populate user role
    const populatedUser = await User.findOneAndUpdate({ _id: leanUser._id }, { $set: folderPayload }, { new: true }).populate({
      path: 'role',
      model: Role,
      select: '-__v -createdAt -updatedAt',
      populate: {
        path: 'features.feature_id',
        model: Feature,
        select: '-__v -createdAt -updatedAt'
      }
    }).lean();
    populatedUser.role.features = populateRole(populatedUser.role.features);
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
  // We populate the user with role data and then we populate the role with features data
  let users = await User.find(params, { planningModification: 0 }).populate({
    path: 'role',
    select: '-__v -updatedAt',
    populate: {
      path: 'features.feature_id',
      select: '-__v -createdAt -updatedAt'
    }
  });
  if (users.length === 0) {
    return Boom.notFound(translate[language].userShowAllNotFound);
  }
  // we can't use lean as it doesn't work well with deep populate so we have to use this workaround to get an array of js objects and not mongoose docs.
  users = users.map(user => user.toObject());
  for (let i = 0, l = users.length; i < l; i++) {
    if (users[i].role && users[i].role.features) {
      users[i].role.features = populateRole(users[i].role.features);
    }
  }
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
    const user = await User.findOne({ _id: req.params._id }).populate({
      path: 'role',
      select: '-__v -createdAt -updatedAt',
      populate: {
        path: 'features.feature_id',
        select: '-__v -createdAt -updatedAt'
      }
    }).lean();
    if (!user) {
      return Boom.notFound(translate[language].userNotFound);
    }
    if (user.role && user.role.features) {
      user.role.features = populateRole(user.role.features);
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
    let role;
    if (req.payload.role) {
      role = await Role.findOne({ name: req.payload.role });
      if (!role) {
        return Boom.notFound(translate[language].roleNotFound);
      }
      req.payload.role = role._id.toString();
    }
    const newBody = clean(flat(req.payload));
    // const newBody = _.pickBy(flat(req.body), !_.isEmpty);
    // Have to update using flat package because of mongoDB object dot notation, or it'll update the whole 'local' object (not partially, so erase "email" for example if we provide only "password")
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $set: newBody }, { new: true }).populate({
      path: 'role',
      select: '-__v -createdAt -updatedAt',
      populate: {
        path: 'features.feature_id',
        select: '-__v -createdAt -updatedAt'
      }
    }).lean();
    if (!userUpdated) {
      return Boom.notFound(translate[language].userNotFound);
    }
    if (userUpdated.role && userUpdated.role.features) {
      userUpdated.role.features = populateRole(userUpdated.role.features);
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
    }).populate({
      path: 'role',
      select: '-__v -createdAt -updatedAt',
      populate: {
        path: 'features.feature_id',
        select: '-__v -createdAt -updatedAt'
      }
    }).lean();
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

// Refresh token
const refreshToken = async (req) => {
  try {
    const user = await User.findOne({ refreshToken: req.payload.refreshToken }).populate({
      path: 'role',
      select: '-__v -createdAt -updatedAt',
      populate: {
        path: 'features.feature_id',
        select: '-__v -createdAt -updatedAt'
      }
    }).lean();
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
    const user = await User.findOneAndUpdate({ 'local.email': req.payload.email }, { $set: payload }, { new: true }).populate('role').lean();
    if (!user) {
      return Boom.notFound(translate[language].userNotFound);
    }
    const mailOptions = {
      from: 'support@alenvi.io', // sender address
      to: req.payload.email, // list of receivers
      subject: 'Changement de mot de passe de votre compte Alenvi', // Subject line
      html: `<p>Bonjour,</p>
             <p>Vous pouvez modifier votre mot de passe en cliquant sur le lien suivant (lien valable une heure) :</p>
             <p><a href="${process.env.WEBSITE_HOSTNAME}/resetPassword/${payload.resetPassword.token}">${process.env.WEBSITE_HOSTNAME}/resetPassword/${payload.resetPassword.token}</a></p>
             <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ne pas tenir compte de cet email.</p>
             <p>Bien cordialement,<br>
                L'équipe Alenvi</p>` // html body
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
    const user = await User.findOne(flat(filter, { maxDepth: 2 })).populate({
      path: 'role',
      select: '-__v -createdAt -updatedAt',
      populate: {
        path: 'features.feature_id',
        select: '-__v -createdAt -updatedAt'
      }
    }).lean();
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
  checkResetPasswordToken
};
