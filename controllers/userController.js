const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
// const flat = require('flat');
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
      _id: alenviUser._id,
      role: alenviUser.role.name,
    };
    const user = clean(payload);
    const expireTime = process.env.NODE_ENV === 'development' && payload.role === 'Admin' ? 86400 : 3600;
    const token = tokenProcess.encode(user, expireTime);
    const { refreshToken } = alenviUser;
    console.log(`${req.payload.email} connected`);
    // return the information including token as JSON
    // return res.status(200).json({ success: true, message: translate[language].userAuthentified, data: { token, user } });
    return { message: translate[language].userAuthentified, data: { token, refreshToken, expiresIn: expireTime, user } };
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
    await user.saveWithRoleId(req.payload.role);
    const leanUser = user.toObject();
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
    return { message: translate[language].userSaved, data: { token, refreshToken: user.refreshToken, expiresIn: expireTime, user: userPayload } };
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

module.exports = { authenticate, create };
