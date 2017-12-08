const express = require('express');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');
const { checkRoles } = require('../../helpers/checkAuthorization');

const router = express.Router();

const roleController = require('../../controllers/roleController');

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

// All these routes need a token because of route protection above
router.post('/', roleController.create);
router.put('/:_id', roleController.update);
router.get('/', roleController.showAll);
router.get('/:_id', roleController.show);
router.delete('/:_id', roleController.remove);

module.exports = router;
