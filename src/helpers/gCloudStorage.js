const get = require('lodash/get');
const moment = require('moment');
const { getStorage } = require('../models/Google/Storage');
const { UPLOAD_DATE_FORMAT } = require('./constants');

exports.formatFileName = fileName =>
  `media-${fileName.replace(/[^a-zA-Z0-9]/g, '')}-${moment().format(UPLOAD_DATE_FORMAT)}`;

exports.uploadProgramMedia = async payload => uploadMedia(payload, process.env.GCS_PROGRAM_BUCKET);

exports.uploadUserMedia = async payload => uploadMedia(payload, process.env.GCS_USER_BUCKET);

const uploadMedia = async (payload, bucketName) => new Promise((resolve, reject) => {
  const { fileName, file } = payload;

  const bucket = getStorage().bucket(bucketName);
  const stream = bucket.file(fileName)
    .createWriteStream({ metadata: { contentType: get(file, 'hapi.headers.content-type') } })
    .on('finish', () => {
      resolve({ link: `https://storage.googleapis.com/${bucket.name}/${fileName}`, publicId: fileName });
    })
    .on('error', (err) => {
      console.error(err);
      reject(new Error('Unable to upload media, something went wrong'));
    });

  file.pipe(stream);
});

exports.deleteMedia = async publicId => new Promise((resolve, reject) => {
  getStorage().bucket(process.env.GCS_BUCKET_NAME).file(publicId).delete({}, (err, res) => {
    if (err) {
      // eslint-disable-next-line no-param-reassign
      err.upload = true;
      reject(err);
    } else resolve(res);
  });
});
