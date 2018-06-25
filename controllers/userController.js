const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const flat = require('flat');
// const nodemailer = require('nodemailer');
const _ = require('lodash');
const Boom = require('boom');

const { clean } = require('../helpers/clean');
const { populateRole } = require('../helpers/populateRole');
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
    console.log(`${req.payload.email} connected`);
    // return the information including token as JSON
    // return res.status(200).json({ success: true, message: translate[language].userAuthentified, data: { token, user } });
    return {
      message: translate[language].userAuthentified,
      data: {
        token, refreshToken, expiresIn: expireTime, user
      }
    };
  } catch (e) {
    console.error(e);
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
      const folder = await drive.addFolder({ folderName: `${req.payload.lastname.toUpperCase()} ${req.payload.firstname}`, parentFolderId: process.env.GOOGLE_DRIVE_AUXILIARIES_FOLDER_ID });
      if (!folder) {
        console.error('Google drive folder creation failed.');
        return Boom.failedDependency('Google drive folder creation failed.');
      }
      const folderLink = await drive.getFileById({ fileId: folder.id });
      if (!folderLink) {
        console.error('Google drive folder creation failed.');
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
    console.error(e);
    // Error code when there is a duplicate key, in this case : the email (unique field)
    if (e.code === 11000) {
      return Boom.conflict(translate[language].userEmailExists);
    } else if (e.name === 'NoRole') {
      return Boom.notFound(translate[language].roleNotFound);
    }
    return Boom.badImplementation();
  }
};

// Show all user
const list = async (req) => {
  if (req.query.role) {
    req.query.role = await Role.findOne({ name: req.query.role }, { _id: 1 }).lean();
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
    console.error(e);
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
    console.error(e);
    // Error code when there is a duplicate key, in this case : the email (unique field)
    if (e.code === 11000) {
      return Boom.conflict(translate[language].userEmailExists);
    }
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
    return Boom.badImplementation();
  }
};

module.exports = {
  authenticate, create, list, show, update, remove
};
