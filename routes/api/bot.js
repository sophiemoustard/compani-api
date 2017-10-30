const express = require('express');

const router = express.Router();

const botController = require('../../controllers/botController');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');

router.get('/authorize', botController.authorize);
router.get('/user/:_id', botController.getUserByParamId); // not protected because we don't want user to re-enter password everytime from the bot

router.post('/sendMessageToBotUser/:_id', tokenProcess.decode({ secret: tokenConfig.secret }), botController.sendMessageToBotUser); // protected

module.exports = router;
