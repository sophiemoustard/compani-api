const get = require('lodash/get');
const { getStorage } = require('../models/Google/Storage');

exports.uploadMedia = async payload => new Promise((resolve, reject) => {
  const { fileName, file } = payload;

  const bucket = getStorage().bucket(process.env.GCS_BUCKET_NAME);
  const blob = bucket.file(`media_${fileName.replace(/[^a-zA-Z0-9]/g, '')}`);
  const stream = blob
    .createWriteStream({ metadata: { contentType: get(file, 'hapi.headers.content-type') } })
    .on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    })
    .on('error', (err) => {
      console.error(err);
      reject(new Error('Unable to upload media, something went wrong'));
    });

  file.pipe(stream);
});

exports.deleteMedia = async publicId => new Promise((resolve, reject) => {
  getStorage().bucket(process.env.GCS_BUCKET_NAME).file(publicId).delete({}, (err, res) => {
    if (err) reject(err);
    else resolve(res);
  });
});
