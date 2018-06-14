const express = require('express');
const path = require('path');

const router = express.Router();

// Alenvi REST API documentation
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/../public/apidoc/index.html'));
});

// Alenvi REST API
router.use('/users', require('./api/users'));
router.use('/bot', require('./api/bot'));
router.use('/ogust', require('./api/ogust'));
router.use('/facebook', require('./api/facebook'));
router.use('/calendar', require('./api/calendar'));
router.use('/blog', require('./api/blog'));
router.use('/messageToBot', require('./api/messageToBot'));
router.use('/planningUpdates', require('./api/planningUpdate'));
router.use('/twilio', require('./api/twilio'));
router.use('/activation', require('./api/activation'));
router.use('/roles', require('./api/role'));
router.use('/features', require('./api/features'));
router.use('/email', require('./api/email'));
router.use('/idNumber', require('./api/idNumber'));
router.use('/uploader', require('./api/uploader'));
router.use('/slack', require('./api/slack'));

module.exports = router;
