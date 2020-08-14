const cloudinary = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.formatPublicId = publicId => publicId.replace(/[<>?&#\\%]/g, '').replace(/^[/\s]/, '').replace(/[/\s]$/, '');

exports.addImage = async params => new Promise((resolve, reject) => {
  const options = {
    folder: params.folder,
    public_id: exports.formatPublicId(params.public_id),
    eager: params.transform ? [params.transform] : [],
  };

  const stream = cloudinary.v2.uploader.upload_stream(options, (err, res) => {
    if (err) reject(new Error(err.message));
    else resolve(res);
  });
  params.file.pipe(stream);
});

exports.deleteImage = async params => new Promise((resolve, reject) => {
  cloudinary.v2.uploader.destroy(params.publicId, (err, res) => {
    if (err) {
      err.cloudinary = true;
      reject(err);
    } else resolve(res);
  });
});
