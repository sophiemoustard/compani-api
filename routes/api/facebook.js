const express = require('express');

const router = express.Router();

const facebookController = require('../../controllers/facebookController');

router.get('/whitelistedDomains', facebookController.getWhitelistedDomains);
router.post('/whitelistedDomains', facebookController.postWhitelistedDomains);

module.exports = router;
