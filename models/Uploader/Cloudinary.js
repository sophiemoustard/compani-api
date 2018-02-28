const cloudinary = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.addImage = async params => new Promise((resolve, reject) => {
  cloudinary.v2.uploader.upload(params.file, { folder: params.folder }, (err, res) => {
    if (err) reject(err);
    resolve(res);
  });
});
