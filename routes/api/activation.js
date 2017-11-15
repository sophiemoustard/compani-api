const express = require('express');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');
const { checkRoles } = require('../../helpers/checkAuthorization');

const router = express.Router();

const activationCodeController = require('../../controllers/activationCodeController');

router.post('/check', activationCodeController.activationCodeAuthentication);

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

router.post('/', checkRoles({ list: ['coach'] }), activationCodeController.createActivationCode);

module.exports = router;
