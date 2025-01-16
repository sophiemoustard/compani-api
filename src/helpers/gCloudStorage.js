const get = require('lodash/get');
const { getStorage } = require('../models/Google/Storage');
const { UPLOAD_DATE_FORMAT } = require('./constants');
const { CompaniDate } = require('./dates/companiDates');

exports.uploadProgramMedia = async payload => uploadMedia(payload, process.env.GCS_PROGRAM_BUCKET);

exports.uploadUserMedia = async payload => uploadMedia(payload, process.env.GCS_USER_BUCKET);

exports.uploadCourseFile = async payload => uploadMedia(payload, process.env.GCS_COURSE_BUCKET);

const formatFileName = fileName =>
  `media-${fileName.replace(/[^a-zA-Z0-9_]/g, '')}-${CompaniDate().format(UPLOAD_DATE_FORMAT)}`;

const uploadMedia = async (payload, bucketName) => new Promise((resolve, reject) => {
  const { file } = payload;
  const fileName = formatFileName(payload.fileName);

  const bucket = getStorage().bucket(bucketName);
  const stream = bucket.file(fileName)
    .createWriteStream({ metadata: { contentType: payload.contentType || get(file, 'hapi.headers.content-type') } })
    .on('finish', () => {
      resolve({ link: `https://storage.googleapis.com/${bucket.name}/${fileName}`, publicId: fileName });
    })
    .on('error', (err) => {
      console.error(err);
      reject(new Error('Unable to upload media, something went wrong'));
    });

  file.pipe(stream);
});

exports.deleteProgramMedia = async payload => deleteMedia(payload, process.env.GCS_PROGRAM_BUCKET);

exports.deleteUserMedia = async payload => deleteMedia(payload, process.env.GCS_USER_BUCKET);

exports.deleteCourseFile = async payload => deleteMedia(payload, process.env.GCS_COURSE_BUCKET);

const deleteMedia = async (publicId, bucketName) => new Promise((resolve, reject) => {
  getStorage().bucket(bucketName).file(publicId).delete({}, (err, res) => {
    if (err) {
      // eslint-disable-next-line no-param-reassign
      err.upload = true;
      reject(err);
    } else resolve(res);
  });
});
