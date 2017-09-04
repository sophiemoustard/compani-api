const bcrypt = require('bcrypt');
const translate = require('../helpers/translate');
const _ = require('lodash');
const tokenProcess = require('../helpers/tokenProcess');

const User = require('../models/User');

const language = translate.language;

module.exports = {
  authorize: (req, res) => {
    if (!req.query.email || !req.query.password) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
      // return response.error(res, 400, translate[language].missingParameters);
    }
    if (!req.query && !req.query.redirect_uri) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
      // return response.error(res, 400, translate[language].missingParameters);
    }
    // Get by local email
    User.findOne({ 'local.email': req.query.email }, (err, user) => {
      if (err) {
        return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
        // return response.error(res, 500, translate[language].unexpectedBehavior);
      }
      if (!user) {
        return res.status(404).send({ success: false, message: `Erreur: ${translate[language].userAuthNotFound}` });
        // return response.error(res, 404, translate[language].userAuthNotFound);
      }
      // check if password matches
      bcrypt.compare(req.query.password, user.local.password, (error, isMatch) => {
        if (error || !isMatch) {
          return res.status(401).send({ success: false, message: `Erreur: ${translate[language].userAuthFailed}` });
          // return response.error(res, 401, translate[language].userAuthFailed);
        }
        const payload = {
          firstname: user.firstname,
          lastname: user.lastname,
          _id: user.id,
          'local.email': user.local.email,
          role: user.role,
          customer_id: user.customer_id,
          employee_id: user.employee_id,
          sector: user.sector
        };
        const newPayload = _.pickBy(payload);
        const token = tokenProcess.encode(newPayload);
        console.log(`${req.query.email} connected`);
        // return the information including token as JSON
        console.log('REDIRECT_URI =');
        console.log(req.query.redirect_uri);
        const redirectUri = `${req.query.redirect_uri}&authorization_code=${token}`;
        return res.redirect(302, redirectUri);
        // return response.success(res, translate[language].userAuthentified, { user: user, token: token } );
      });
    });
  },
  getUserByParamId: (req, res) => {
    User.findOne({ _id: req.params._id }, (err, user) => {
      if (err || !user) {
        res.status(404).send({ success: false, message: translate[language].userNotFound });
      } else {
        const payload = {
          firstname: user.firstname,
          lastname: user.lastname,
          _id: user.id,
          'local.email': user.local.email,
          role: user.role,
          customer_id: user.customer_id,
          employee_id: user.employee_id,
          sector: user.sector
        };
        const newPayload = _.pickBy(payload);
        res.status(200).send({ success: true, message: translate[language].userFound, data: { user: newPayload } });
      }
    });
  }
};
