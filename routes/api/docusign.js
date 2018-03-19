const express = require('express');

const router = express.Router();

const docusignController = require('../../controllers/docusignController');

router.post('/actions', docusignController.handleDocusignActions);

module.exports = router;
