const express = require('express');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');
const { checkRoles } = require('../../helpers/checkAuthorization');

const router = express.Router();

const emailController = require('../../controllers/emailController');

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

router.post('/send', checkRoles({ list: ['Coach'] }), emailController.sendMail);

module.exports = router;
