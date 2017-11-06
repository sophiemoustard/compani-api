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

module.exports = router;
