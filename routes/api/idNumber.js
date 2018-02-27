const express = require('express');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');

const router = express.Router();

const idNumberController = require('../../controllers/idNumberController');

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

// Create number
router.post('/create', idNumberController.createNumber);

module.exports = router;
