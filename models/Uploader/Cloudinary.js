const cloudinary = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.addImage = async params => new Promise((resolve, reject) => {
  const options = {
    folder: params.folder,
    public_id: params.fileName,
    eager: params.transform ? [params.transform] : []
  };
  cloudinary.v2.uploader.upload(params.filePath, options, (err, res) => {
    if (err) {
      err.cloudinary = true;
      reject(err);
    }
    resolve(res);
  });
});

exports.deleteImage = async params => new Promise((resolve, reject) => {
  cloudinary.v2.uploader.destroy(params.publicId, (err, res) => {
    if (err) {
      err.cloudinary = true;
      reject(err);
    }
    resolve(res);
  });
});
