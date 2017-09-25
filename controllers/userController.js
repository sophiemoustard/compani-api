// const db            = require('../config/database');
// const tokenConfig   = require('../config/strategies').token;
const bcrypt = require('bcrypt');
const translate = require('../helpers/translate');

const language = translate.language;
// const jwt           = require('jsonwebtoken');
const _ = require('lodash');
const tokenProcess = require('../helpers/tokenProcess');

const User = require('../models/User');

// Find an user by Id in param URL
const getUserByParamId = (req, res, next) => {
  User.findOne({ _id: req.params._id }, (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: translate[language].userNotFound });
    }
    req.user = user;
    // Callback for success
    next();
  });
};

// Check if user is allowed to access to this route : only himself or admin / coach can validate through this function
const checkOnlyUserAllowed = (req, res, next) => {
  if (req.decoded.role != 'admin' && req.decoded.role != 'coach' && req.params._id !== req.decoded.id) {
    return res.status(403).json({ success: false, message: translate[language].forbidden });
  }
  next();
};

// Authenticate the user locally
const authenticate = (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ success: false, message: translate[language].missingParameters });
  }
  // Get by local email
  User.findOne({ 'local.email': req.body.email }, (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
    }
    if (!user) {
      return res.status(404).json({ success: false, message: translate[language].userAuthNotFound });
    }
    // check if password matches
    bcrypt.compare(req.body.password, user.local.password, (error, isMatch) => {
      if (error || !isMatch) {
        return res.status(401).json({ success: false, message: translate[language].userAuthFailed });
      }
      const payload = {
        firstname: user.firstname,
        lastname: user.lastname,
        _id: user.id,
        'local.email': user.local.email,
        role: user.role,
        customer_id: user.customer_id,
        employee_id: user.employee_id,
        sector: user.sector,
        'youtube.link': user.youtube.link,
        'youtube.location': user.youtube.location,
        picture: user.picture
      };
      const newPayload = _.pickBy(payload);
      const token = tokenProcess.encode(newPayload);
      console.log(`${req.body.email} connected`);
      // return the information including token as JSON
      return res.status(200).json({ success: true, message: translate[language].userAuthentified, data: { token, user } });
    });
  });
};

// Create a new user
const create = (req, res) => {
  // Check if users mandatory fields are existing
  if (req.body.email && req.body.password && req.body.role) {
    const payload = {
      firstname: req.body.firstname ? req.body.firstname : '',
      lastname: req.body.lastname ? req.body.lastname : '',
      'local.email': req.body.email,
      'local.password': req.body.password,
      employee_id: req.body.employee_id ? req.body.employee_id : '',
      customer_id: req.body.customer_id ? req.body.customer_id : '',
      role: req.body.role,
      sector: req.body.sector ? req.body.sector : '',
      'facebook.facebookId': req.body.facebookId ? req.body.facebookId : '',
      'facebook.email': req.body.facebookEmail ? req.body.facebookEmail : '',
      'slack.slackId': req.body.slackId ? req.body.slackId : '',
      'slack.email': req.body.slackEmail ? req.body.slackEmail : '',
      'youtube.link': req.body.youtubeLink ? req.body.youtubeLink : '',
      picture: req.body.picture ? req.body.picture : ''
    };
    if (req.body.youtubeLocation) {
      payload.youtube.location = req.body.youtubeLocation;
    }
    const newPayload = _.pickBy(payload);
    const newUser = User(
      newPayload
    );
    newUser.save((err, user) => {
      if (err) {
        console.error(err);
        // Error code when there is a duplicate key, in this case : the email (unique field)
        if (err.code === 11000) {
          return res.status(409).json({ success: false, message: translate[language].userEmailExists });
        } else if (err.name === 'InvalidEmail') {
          return res.status(400).json({ success: false, message: translate[language].invalidEmail });
        }
        return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
      }
      return res.status(200).json({ success: true, message: translate[language].userSaved, data: { user } });
    });
  } else {
    // Mandatory fields are missing or not found
    return res.status(400).json({ success: false, message: translate[language].missingParameters });
  }
};

// Get all users presentation for alenvi.io (youtube + picture)
const getPresentation = (req, res) => {
  User.find({ 'youtube.location': { $in: req.query.location }, role: { $in: req.query.role } },
    { _id: 0, firstname: 1, lastname: 1, role: 1, picture: 1, youtube: 1 }, (err, users) => {
      if (err) {
        return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
      }
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: translate[language].userShowAllNotFound });
      }
      return res.status(200).json({ success: true, message: translate[language].userShowAllFound, data: { users } });
    });
};

// Show all user
const showAll = (req, res) => {
  // No security here to restrict access
  User.find({}, (err, users) => {
    if (err) {
      return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
    }
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].userShowAllNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].userShowAllFound, data: { users } });
  });
};

// Show an user by ID
const show = (req, res) => {
  getUserByParamId(req, res, () => {
    return res.status(200).json({ success: true, message: translate[language].userFound, data: { user: req.user } });
  });
};

// Update an user by email (unique field)
const update = (req, res) => {
  checkOnlyUserAllowed(req, res, () => {
    getUserByParamId(req, res, () => {
      // In case of success
      // Fields allowed for update
      if (req.body.firstname) {
        req.user.firstname = req.body.firstname;
      }
      if (req.body.lastname) {
        req.user.lastname = req.body.lastname;
      }
      if (req.body.email) {
        req.user.local.email = req.body.email;
      }
      if (req.body.password) {
        req.user.local.password = req.body.password;
      }
      if (req.body.role) {
        req.user.role = req.body.role;
      }
      if (req.body.employee_id) {
        req.user.employee_id = req.body.employee_id;
      }
      if (req.body.customer_id) {
        req.user.customer_id = req.body.customer_id;
      }
      if (req.body.sector) {
        req.user.sector = req.body.sector;
      }
      if (req.body.facebookId) {
        req.user.facebook.facebookId = req.body.facebookId;
      }
      if (req.body.facebookEmail) {
        req.user.facebook.email = req.body.facebookEmail;
      }
      if (req.body.slackId) {
        req.user.slack.slackId = req.body.slackId;
      }
      if (req.body.slackEmail) {
        req.user.slack.email = req.body.slackEmail;
      }
      if (req.body.youtubeLink) {
        req.user.youtube.link = req.body.youtubeLink;
      }
      if (req.body.youtubeLocation) {
        req.user.youtube.location = req.body.youtubeLocation;
      }
      if (req.body.picture) {
        req.user.picture = req.body.picture;
      }
      req.user.save((err) => {
        if (err) {
          // Error code when there is a duplicate key, in this case : the email (unique field)
          if (err.code === 11000) {
            return res.status(409).json({ success: false, message: translate[language].userEmailExists });
          }
          return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
        }
        return res.status(200).json({ success: true, message: translate[language].userUpdated, data: { user: req.user } });
      });
    });
  });
};

// Remove an user by param id
const remove = (req, res) => {
  checkOnlyUserAllowed(req, res, () => {
    getUserByParamId(req, res, () => {
      req.user.remove({}, (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
        }
        return res.status(200).json({ success: true, message: translate[language].userRemoved });
      });
    });
  });
};

module.exports = {
  authenticate,
  update,
  create,
  show,
  showAll,
  remove,
  getPresentation
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
