const Cloud = require('@google-cloud/storage');

const { Storage } = Cloud;
const storage = new Storage({
  keyFilename: './src/models/Google/GCSConfig.json',
  projectId: process.env.GOOGLE_CLOUD_STORAGE_PROJECT_ID,
});

module.exports = storage;
