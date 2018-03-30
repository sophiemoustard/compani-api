const express = require('express');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');
const { checkRoles } = require('../../helpers/checkAuthorization');

const router = express.Router();

const emailController = require('../../controllers/emailController');

router.post('/sendUserRequest', emailController.sendUserRequest);

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

router.post('/sendWelcome', checkRoles({ list: ['Coach'] }), emailController.sendWelcome);
router.post('/sendChangePasswordOk', emailController.sendChangePasswordOk);

module.exports = router;
