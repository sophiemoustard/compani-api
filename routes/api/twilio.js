const express = require('express');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');
const { checkRoles } = require('../../helpers/checkAuthorization');

const router = express.Router();

const twilioController = require('../../controllers/twilioController');

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

router.post('/send/:phoneNbr', twilioController.sendSMS);

module.exports = router;
