const bcrypt = require('bcrypt');
const translate = require('../helpers/translate');
const _ = require('lodash');
const tokenProcess = require('../helpers/tokenProcess');

const User = require('../models/User');
const Role = require('../models/Role');
const { populateRole } = require('../helpers/populateRole');

const language = translate.language;

module.exports = {
  authorize: async (req, res) => {
    if (!req.body.email || !req.body.password) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
      // return response.error(res, 400, translate[language].missingParameters);
    }
    // Get by local email
    let user = {};
    try {
      user = await User.findOne({ 'local.email': req.body.email });
      if (!user) {
        return res.status(404).send({ success: false, message: `Erreur: ${translate[language].userAuthNotFound}` });
        // return response.error(res, 404, translate[language].userAuthNotFound);
      }
      // check if password matches
      if (!await bcrypt.compare(req.body.password, user.local.password)) {
        return res.status(401).json({ success: false, message: `Erreur: ${translate[language].userAuthFailed}` });
      }
      const payload = {
        firstname: user.firstname,
        lastname: user.lastname,
        _id: user.id,
        local: {
          email: user.local.email
        },
        role: user.role,
        customer_id: user.customer_id,
        employee_id: user.employee_id,
        sector: user.sector,
        createdAt: user.createdAt,
      };
      const newPayload = _.pickBy(payload);
      const token = tokenProcess.encode(newPayload);
      console.log(`${req.body.email} connected`);
      // return the information including token as JSON
      return res.status(200).json({ success: true, message: translate[language].userAuthentified, data: { token, user } });
      // return response.success(res, translate[language].userAuthentified, { user: user, token: token } );
    } catch (e) {
      return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
      // return response.error(res, 500, translate[language].unexpectedBehavior);
    }
  },
  // authorize: async (req, res) => {
  //   if (!req.query.email || !req.query.password) {
  //     return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
  //     // return response.error(res, 400, translate[language].missingParameters);
  //   }
  //   if (!req.query && !req.query.redirect_uri) {
  //     return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
  //     // return response.error(res, 400, translate[language].missingParameters);
  //   }
  //   // Get by local email
  //   let user = {};
  //   try {
  //     user = await User.findOne({ 'local.email': req.query.email });
  //     if (!user) {
  //       return res.status(404).send({ success: false, message: `Erreur: ${translate[language].userAuthNotFound}` });
  //       // return response.error(res, 404, translate[language].userAuthNotFound);
  //     }
  //     // check if password matches
  //     if (!await bcrypt.compare(req.query.password, user.local.password)) {
  //       return res.status(401).json({ success: false, message: `Erreur: ${translate[language].userAuthFailed}` });
  //     }
  //     const payload = {
  //       firstname: user.firstname,
  //       lastname: user.lastname,
  //       _id: user.id,
  //       'local.email': user.local.email,
  //       role: user.role,
  //       customer_id: user.customer_id,
  //       employee_id: user.employee_id,
  //       sector: user.sector
  //     };
  //     const newPayload = _.pickBy(payload);
  //     const token = tokenProcess.encode(newPayload);
  //     console.log(`${req.query.email} connected`);
  //     // return the information including token as JSON
  //     console.log('REDIRECT_URI =');
  //     console.log(req.query.redirect_uri);
  //     const redirectUri = `${req.query.redirect_uri}&authorization_code=${token}`;
  //     return res.redirect(302, redirectUri);
  //     // return response.success(res, translate[language].userAuthentified, { user: user, token: token } );
  //   } catch (e) {
  //     return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
  //     // return response.error(res, 500, translate[language].unexpectedBehavior);
  //   }
  // },
  getUserByParamId: async (req, res) => {
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
        return res.status(404).send({ success: false, message: translate[language].userNotFound });
      }
      const alenviToken = tokenProcess.encode({ _id: user._id });
      const payload = {
        firstname: user.firstname,
        lastname: user.lastname,
        _id: user._id,
        local: {
          email: user.local.email
        },
        role: user.role.name,
        customer_id: user.customer_id,
        employee_id: user.employee_id,
        sector: user.sector,
        administrative: user.administrative,
        managerId: user.managerId,
        createdAt: user.createdAt,
        slack: user.slack,
        token: alenviToken
      };
      // const newPayload = _.pickBy(payload);
      res.status(200).send({ success: true, message: translate[language].userFound, data: { user: payload } });
    } catch (e) {
      return res.status(404).send({ success: false, message: translate[language].userNotFound });
    }
  },
  // Show all user
  showAll: async (req, res) => {
  // No security here to restrict access
    try {
      if (req.query.role) {
        req.query.role = await Role.findOne({ name: req.query.role }, { _id: 1 }).lean();
      }
      const params = _.pickBy(req.query);
      // We populate the user with role data and then we populate the role with features data
      let users = await User.find(params).populate({
        path: 'role',
        select: '-__v -createdAt -updatedAt',
        populate: {
          path: 'features.feature_id',
          select: '-__v -createdAt -updatedAt'
        }
      });
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: translate[language].userShowAllNotFound });
      }
      // we can't use lean as it doesn't work well with deep populate so we have to use this workaround to get an array of js objects and not mongoose docs.
      users = users.map(user => user.toObject());
      // Format populated role to be read easier
      for (let i = 0, l = users.length; i < l; i++) {
        if (users[i].role && users[i].role.features) {
          users[i].role.features = populateRole(users[i].role.features);
        }
      }
      return res.status(200).json({ success: true, message: translate[language].userShowAllFound, data: { users } });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
    }
  }
};
