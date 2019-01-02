const Boom = require('boom');
const moment = require('moment');
const flat = require('flat');

const translate = require('../helpers/translate');
const { addFile } = require('../helpers/gdriveStorage');
const drive = require('../models/GoogleDrive');
const cloudinary = require('../models/Cloudinary');
const User = require('../models/User');

const { language } = translate;

const uploadFile = async (req) => {
  try {
    const allowedFields = [
      'idCardRecto',
      'idCardVerso',
      'healthAttest',
      'certificates',
      'phoneInvoice',
      'navigoInvoice',
      'transportInvoice',
      'mutualFund',
      'vitalCard',
    ];
    const administrativeKeys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    const uploadedFile = await addFile({
      _id: req.params._id,
      name: req.payload.fileName || req.payload[administrativeKeys[0]].hapi.filename,
      type: req.payload['Content-Type'],
      body: req.payload[administrativeKeys[0]]
    });
    let driveFileInfo;
    try {
      driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });
    } catch (e) {
      req.log(['error', 'gdrive'], e);
    }
    if (administrativeKeys[0] === 'certificates') {
      const payload = {
        [`administrative.${administrativeKeys[0]}.docs`]: {
          driveId: uploadedFile.id,
          link: driveFileInfo.webViewLink
        }
      };
      await User.findOneAndUpdate({ _id: req.params._id }, { $push: payload }, { new: true });
    } else {
      const payload = {
        administrative: {
          [administrativeKeys[0]]: {
            driveId: uploadedFile.id,
            link: driveFileInfo.webViewLink
          }
        }
      };
      const user = await User.findById(req.params._id).lean();
      if (user.administrative && user.administrative[administrativeKeys[0]]) {
        const oldDocId = user.administrative[administrativeKeys[0]].driveId;
        try {
          await drive.deleteFile({ fileId: oldDocId });
        } catch (e) {
          req.log(['error', 'gdrive'], e);
        }
      }
      await User.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true });
    }
    return { message: translate[language].fileCreated, data: uploadedFile };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const uploadImage = async (req) => {
  try {
    const pictureUploaded = await cloudinary.addImage({
      file: req.payload.picture,
      role: req.payload.role,
      public_id: `${req.payload.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`
    });
    const user = await User.findById(req.params._id).lean();
    if (user.picture && user.picture.publicId) {
      await cloudinary.deleteImage({ publicId: user.picture.publicId });
    }
    // const uploadedImage = req.file;
    const payload = {
      picture: {
        publicId: pictureUploaded.public_id,
        link: pictureUploaded.secure_url
      }
    };
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true });
    return { message: translate[language].fileCreated, data: { picture: payload.picture, userUpdated } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  uploadFile,
  uploadImage
};
