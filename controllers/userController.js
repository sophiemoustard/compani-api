// const db            = require('../config/database');
// const tokenConfig   = require('../config/strategies').token;
const bcrypt = require('bcrypt');
const dot = require('dot-object');
const uuidv4 = require('uuid/v4');
const translate = require('../helpers/translate');

const language = translate.language;
// const jwt           = require('jsonwebtoken');
const _ = require('lodash');
const tokenProcess = require('../helpers/tokenProcess');

const User = require('../models/User');

// Authenticate the user locally
const authenticate = async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ success: false, message: translate[language].missingParameters });
  }
  // Get by local email
  try {
    const alenviUser = await User.findOne({ 'local.email': req.body.email });
    if (!alenviUser) {
      return res.status(404).json({ success: false, message: translate[language].userAuthNotFound });
    }
    // Check if user is allowed to (re)connect
    if (!alenviUser.refreshToken) {
      return res.status(403).json({ success: false, message: translate[language].forbidden });
    }
    // check if password matches
    if (!await bcrypt.compare(req.body.password, alenviUser.local.password)) {
      return res.status(401).json({ success: false, message: translate[language].userAuthFailed });
    }
    const payload = {
      // firstname: user.firstname,
      // lastname: user.lastname,
      _id: alenviUser.id,
      // 'local.email': user.local.email,
      role: alenviUser.role,
      // customer_id: user.customer_id,
      // employee_id: user.employee_id,
      // sector: user.sector,
      // 'youtube.link': user.youtube.link,
      // 'youtube.location': user.youtube.location,
      // picture: user.picture
    };
    const user = _.pickBy(payload);
    const expireTime = 3600;
    const token = tokenProcess.encode(user, expireTime);
    const refreshToken = alenviUser.refreshToken;
    console.log(`${req.body.email} connected`);
    // return the information including token as JSON
    // return res.status(200).json({ success: true, message: translate[language].userAuthentified, data: { token, user } });
    return res.status(200).json({ success: true, message: translate[language].userAuthentified, data: { token, refreshToken, expiresIn: expireTime, user } });
  } catch (e) {
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Create a new user
const create = async (req, res) => {
  // Check if users mandatory fields are missing
  if (!req.body.email && !req.body.password && !req.body.role) {
    return res.status(400).json({ success: false, message: translate[language].missingParameters });
  }
  try {
    // Create refreshToken and store it
    req.body.refreshToken = uuidv4();
    const user = new User(req.body);
    // Save user
    await user.save();
    const payload = {
      _id: user.id,
      role: user.role,
    };
    const userPayload = _.pickBy(payload);
    const expireTime = 3600;
    const token = tokenProcess.encode(user, expireTime);
    return res.status(200).json({ success: true, message: translate[language].userSaved, data: { token, refreshToken: user.refreshToken, expiresIn: expireTime, user: userPayload } });
  } catch (e) {
    console.error(e);
    // Error code when there is a duplicate key, in this case : the email (unique field)
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: translate[language].userEmailExists });
    } else if (e.name === 'InvalidEmail') {
      return res.status(400).json({ success: false, message: translate[language].invalidEmail });
    }
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Get all users presentation for alenvi.io (youtube + picture)
const getPresentation = async (req, res) => {
  const params = {
    'youtube.location': _.isArray(req.query.location) ? { $in: req.query.location } : req.query.location,
    role: _.isArray(req.query.role) ? { $in: req.query.role } : req.query.role
  };
  const payload = _.pickBy(params);
  try {
    const users = User.find(payload, { _id: 0, firstname: 1, lastname: 1, role: 1, picture: 1, youtube: 1 });
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].userShowAllNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].userShowAllFound, data: { users } });
  } catch (e) {
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Show all user
const showAll = async (req, res) => {
  // No security here to restrict access
  try {
    const users = await User.find(req.query);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].userShowAllNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].userShowAllFound, data: { users } });
  } catch (e) {
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Find an user by Id in param URL
const show = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params._id });
    if (!user) {
      return res.status(404).json({ success: false, message: translate[language].userNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].userFound, data: { user } });
  } catch (e) {
    return res.status(404).json({ success: false, message: translate[language].userNotFound });
  }
};

// Update an user by id
const update = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: translate[language].missingParameters });
  }
  try {
    // Have to update using dot-object package because of mongoDB object dot notation, or it'll update the whole 'local' object (not partially, so erase "email" for example if we provide only "password")
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $set: dot.dot(req.body) }, { new: true });
    if (!userUpdated) {
      return res.status(404).json({ success: false, message: translate[language].userNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].userUpdated, data: { userUpdated } });
  } catch (e) {
    // Error code when there is a duplicate key, in this case : the email (unique field)
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: translate[language].userEmailExists });
    }
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const refreshToken = async (req, res) => {
  if (!req.body.refreshToken) {
    return res.status(400).json({ success: false, message: translate[language].missingParameters });
  }
  try {
    const user = await User.findOne({ refreshToken: req.body.refreshToken });
    if (!user) {
      return res.status(401).json({ success: false, message: translate[language].refreshTokenNotFound });
    }
    const payload = {
      _id: user.id,
      role: user.role,
    };
    const userPayload = _.pickBy(payload);
    const expireTime = 3600;
    const token = tokenProcess.encode(userPayload, expireTime);
    // return the information including token as JSON
    return res.status(200).json({ success: true, message: translate[language].userAuthentified, data: { token, refreshToken: user.refreshToken, expiresIn: expireTime, user: userPayload } });
  } catch (e) {
    console.error(e);
    return res.status(404).json({ success: false, message: translate[language].userNotFound });
  }
};

const generateRefreshToken = async (req, res) => {
  try {
    const randomToken = uuidv4();
    return res.status(200).json({ success: true, message: 'Token generated.', data: { randomToken } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
}

// Store user address from bot
const storeUserAddress = async (req, res) => {
  try {
    if (!req.body.payload) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const userAddressStored = await User.findOneAndUpdate({ _id: req.params._id }, { $set: { 'facebook.address': req.body.payload } }, { new: true });
    if (!userAddressStored) {
      return res.status(404).json({ success: false, message: translate[language].userNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].userAddressStored, data: { userAddressStored } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Get sectors
const getAllSectors = async (req, res) => {
  try {
    const users = await User.find({ sector: { $nin: ['*'] } }, { sector: 1, firstname: 1 });
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].userShowAllNotFound });
    }
    const usersBySector = _.groupBy(users, 'sector');
    return res.status(200).json({ success: true, message: translate[language].userSectorsFound, data: { sectors: usersBySector } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Remove an user by param id
const remove = async (req, res) => {
  try {
    const userDeleted = await User.findByIdAndRemove({ _id: req.params._id });
    if (!userDeleted) {
      return res.status(404).json({ success: false, message: translate[language].userNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].userRemoved, data: { userDeleted } });
  } catch (e) {
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  authenticate,
  update,
  create,
  show,
  showAll,
  remove,
  refreshToken,
  getPresentation,
  storeUserAddress,
  getAllSectors,
  generateRefreshToken
};

// bothauthFacebook: function(req, res) {
//   if (!req.body.id) {
//     return response.error(res, 400, translate[language].missingParameters);
//   }
//   User.findOne({'facebook.facebookId': req.body.id}, function(err, user) {
//     if (err) {
//       return response.error(res, 500, translate[language].unexpectedBehavior);
//     }
//     // If there is no facebook ID in Alenvi, check for email
//     if (!user && req.body.email) {
//       User.findOne({
//         $or: [
//           {'facebook.email': req.body.email},
//           {'local.email': req.body.email}
//         ]
//       }, function(err, user) {
//         if (err) {
//           return response.error(res, 500, translate[language].unexpectedBehavior);
//         }
//         if (!user) {
//           return response.error(res, 404, translate[language].userAuthNotFound);
//         }
//         // If there is a local Alenvi email which is the same as the facebook one provided, create it
//         if (!user.facebook.email) {
//           user.facebook.email = req.body.email;
//           user.facebook.facebookId = req.body.id;
//           user.save(function(err) {
//             if (err) {
//               return response.error(res, 500, translate[language].unexpectedBehavior);
//             }
//           })
//         }
//         var payload = {
//           '_id': user.id,
//           'firstname': user.firstname,
//           'lastname': user.lastname,
//           'local': user.local,
//           'facebook': user.facebook,
//           'role': user.role,
//           'customer_id': user.customer_id,
//           'employee_id': user.employee_id,
//           'sector': user.sector
//         }
//         var newPayload = _.pickBy(payload);
//         var token = tokenProcess.encode(newPayload);
//         return response.success(res, translate[language].userAuthentified, { user: user, token: token });
//       })
//     }
//     else if (!user && !req.body.email) {
//       return response.error(res, 404, translate[language].userAuthNotFound);
//     }
//     else {
//       var payload = {
//         '_id': user.id,
//         'firstname': user.firstname,
//         'lastname': user.lastname,
//         'local': user.local,
//         'facebook': user.facebook,
//         'role': user.role,
//         'customer_id': user.customer_id,
//         'employee_id': user.employee_id,
//         'sector': user.sector
//       }
//       console.log(user);
//       var newPayload = _.pickBy(payload);
//       var token = tokenProcess.encode(newPayload);
//       return response.success(res, translate[language].userAuthentified, { user: user, token: token });
//     }
//   })
// },
