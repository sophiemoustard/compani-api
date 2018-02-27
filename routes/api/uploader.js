const express = require('express');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');

const router = express.Router();

const uploaderController = require('../../controllers/uploaderController');

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

router.post('/drive/createFolder', uploaderController.createFolder);
router.post('/drive/createFile', uploaderController.createFile);

module.exports = router;
