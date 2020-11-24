const { Storage } = require('@google-cloud/storage');

exports.getStorage = () => new Storage({
  credentials: {
    client_email: process.env.GCS_API_EMAIL,
    private_key: process.env.GCS_API_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GCP_PROJECT,
});
