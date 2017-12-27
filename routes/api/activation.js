const express = require('express');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');
const { checkRoles } = require('../../helpers/checkAuthorization');

const router = express.Router();

const activationCodeController = require('../../controllers/activationCodeController');

// Check if code is OK
router.get('/:code', activationCodeController.checkActivationCode);

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

// Create code
router.post('/', checkRoles({ list: ['Coach'] }), activationCodeController.createActivationCode);
router.delete('/:mobile_phone', checkRoles({ list: ['Coach'], checkById: true }), activationCodeController.deleteActivationCode);

module.exports = router;
