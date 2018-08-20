const cloudinary = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.addImage = async params => new Promise((resolve, reject) => {
  let folder = '';
  switch (params.role) {
    case 'Coach':
      folder = 'images/users/coaches';
      break;
    case 'Tech':
      folder = 'images/users/IT';
      break;
    case 'Mkt':
      folder = 'images/users/Mkt';
      break;
    case 'Auxiliaire':
      folder = 'images/users/auxiliaries';
      break;
    default:
      folder = 'images/users/auxiliaries';
      break;
  }
  const options = {
    folder,
    public_id: params.public_id,
    eager: params.transform ? [params.transform] : []
  };
  const stream = cloudinary.v2.uploader.upload_stream(options, (err, res) => {
    if (err) {
      err.cloudinary = true;
      reject(err);
    }
    resolve(res);
  });
  params.file.pipe(stream);
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
