const express = require('express');

const router = express.Router();

const planningUpdateController = require('../../controllers/planningUpdateController');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');

// protected routes
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

router.get('/', planningUpdateController.getModificationPlanning);
router.post('/', planningUpdateController.storeUserModificationPlanning);
router.put('/:_id/status', planningUpdateController.updateModificationPlanningStatusById);
router.delete('/:_id', planningUpdateController.removeModificationPlanningById);

module.exports = router;
