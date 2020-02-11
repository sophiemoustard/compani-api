const Boom = require('boom');
const translate = require('../helpers/translate');
const cloudinary = require('../models/Cloudinary');

const { language } = translate;

const deleteImage = async (req) => {
  try {
    await cloudinary.deleteImage({ publicId: req.params.id });
    return { message: translate[language].fileDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  deleteImage,
};
