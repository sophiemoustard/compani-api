const express = require('express');

const router = express.Router();

const planningUpdateController = require('../../controllers/planningUpdateController');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');

// protected routes
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

router.get('/', planningUpdateController.getModificationPlanning);
router.put('/', planningUpdateController.storeUserModificationPlanning);

module.exports = router;
