const Boom = require('boom');
const flat = require('flat');
const moment = require('moment');

const translate = require('../helpers/translate');
const User = require('../models/User');
const cloudinary = require('../models/Cloudinary');

const { language } = translate;

const uploadImage = async (req) => {
  try {
    const pictureUploaded = await cloudinary.addImage({
      file: req.payload.picture,
      role: req.payload.role,
      public_id: `${req.payload.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`
    });
    const payload = {
      picture: {
        publicId: pictureUploaded.public_id,
        link: pictureUploaded.secure_url
      }
    };
    const userUpdated = await User.findOneAndUpdate({ _id: req.payload._id }, { $set: flat(payload) }, { new: true });
    return { message: translate[language].fileCreated, data: { picture: payload.picture, userUpdated } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const deleteImage = async (req) => {
  try {
    await cloudinary.deleteImage({ publicId: req.payload.id });
    return { message: translate[language].fileDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  uploadImage,
  deleteImage
};
