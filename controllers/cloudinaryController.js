const Boom = require('boom');
const moment = require('moment');

const translate = require('../helpers/translate');
const cloudinary = require('../models/Cloudinary');

const { language } = translate;

const deleteImage = async (req) => {
  try {
    await cloudinary.deleteImage({ publicId: req.params.id });
    return { message: translate[language].fileDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const uploadImage = async (req) => {
  try {
    const pictureUploaded = await cloudinary.addImage({
      file: req.payload.picture,
      role: req.payload.role || 'Auxiliaire',
      public_id: `${req.payload.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`
    });

    return {
      message: translate[language].fileCreated,
      data: { picture: pictureUploaded }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  deleteImage,
  uploadImage
};
