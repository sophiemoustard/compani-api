const express = require('express');

const router = express.Router();

const botController = require('../../controllers/botController');

router.post('/authorize', botController.authorize);
router.get('/user/:_id', botController.getUserByParamId); // not protected because we don't want user to re-enter password everytime from the bot
router.get('/users', botController.showAll);

module.exports = router;
