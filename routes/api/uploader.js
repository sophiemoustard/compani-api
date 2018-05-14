const express = require('express');
const multer = require('multer');
const cloudinaryStorage = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary');
const moment = require('moment');

const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');
const gdriveStorage = require('../../helpers/gdriveStorage');
const driveStorageFields = require('../../helpers/gdriveStorageFields');

const router = express.Router();

const uploaderController = require('../../controllers/uploaderController');

// Google drive storage
const googleDriveStorage = gdriveStorage();
const gdriveUpload = multer({ storage: googleDriveStorage, limits: { fileSize: 5000000 } });

// Cloudinary storage
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const cloudStorage = cloudinaryStorage({
  cloudinary,
  folder: (req, file, cb) => {
    if (req.body.role) {
      switch (req.body.role) {
        case 'Coach':
          cb(null, 'images/users/coaches');
          break;
        case 'Tech':
          cb(null, 'images/users/IT');
          break;
        case 'Mkt':
          cb(null, 'images/users/Mkt');
          break;
        case 'Auxiliaire':
          cb(null, 'images/users/auxiliaries');
          break;
      }
    } else {
      cb(null, 'images/users/auxiliaries');
    }
  },
  // folder: 'images/users/auxiliaries',
  filename: (req, file, cb) => {
    cb(null, `${req.body.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`);
  },
  allowedFormats: ['jpg', 'png', 'gif']
});
const cloudinaryUpload = multer({ storage: cloudStorage, limits: { fileSize: 5000000 } });

// Routes protection by token
router.use(tokenProcess.decode({ secret: tokenConfig.secret }));

router.post('/drive/createFolder', uploaderController.createFolder);
router.post('/:_id/drive/uploadFile', gdriveUpload.fields(driveStorageFields), uploaderController.uploadFile);
router.post('/:_id/cloudinary/uploadImage', cloudinaryUpload.single('picture'), uploaderController.uploadImage);

module.exports = router;
