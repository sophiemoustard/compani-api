const express = require('express');

const router = express.Router();

const blogController = require('../../controllers/blogController');

router.get('/rssFeeds', blogController.getRssFeeds);

module.exports = router;
