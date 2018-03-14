const express = require('express');

const router = express.Router();

const slackController = require('../../controllers/slackController');

router.post('/actions', slackController.handleSlackActions);

module.exports = router;
