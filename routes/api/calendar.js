const express = require('express');

const router = express.Router();

// const { checkOgustToken } = require('../../helpers/checkOgustToken');
// const tokenConfig = require('../../config/strategies').token;
// const tokenProcess = require('../../helpers/tokenProcess');

const calendarController = require('./../../controllers/calendarController');

// router.use(checkOgustToken);
router.get('/events', calendarController.getEvents);

module.exports = router;
