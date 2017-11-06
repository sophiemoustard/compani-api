const express = require('express');

const router = express.Router();

const messageController = require('../../controllers/messageController');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');

// protected routes
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

router.get('/', messageController.getAllMessages);
router.get('/:_id/send', messageController.sendMessageById);
router.get('/user/:_id', messageController.getMessagesBySenderId);
router.post('/', messageController.storeMessage);
router.put('/:_id/recipient', messageController.addMessageRecipientById);

module.exports = router;
