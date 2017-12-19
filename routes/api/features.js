const express = require('express');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');
const { checkRoles } = require('../../helpers/checkAuthorization');

const router = express.Router();

const featureController = require('../../controllers/featureController');

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

// All these routes need a token because of route protection above
router.post('/', featureController.create);
router.put('/:_id', featureController.update);
router.get('/', featureController.showAll);
router.get('/:_id', featureController.show);
router.delete('/:_id', featureController.remove);

module.exports = router;
