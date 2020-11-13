const moment = require('moment');
const get = require('lodash/get');
const { getStorage } = require('../models/Google/Storage');

exports.uploadMedia = async payload => new Promise((resolve, reject) => {
  const { fileName, file } = payload;

  const gcs = getStorage();

  const bucket = gcs.bucket(process.env.GCS_BUCKET_NAME);
  const blob = bucket.file(`${fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`);
  const stream = blob.createWriteStream({ metadata: { contentType: get(file, 'hapi.headers.content-type') } })
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
