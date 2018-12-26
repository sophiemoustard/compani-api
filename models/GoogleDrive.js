const fs = require('fs');
const { google } = require('googleapis');

const jwtClient = new google.auth.JWT(
  process.env.GOOGLE_DRIVE_API_EMAIL,
  null,
  process.env.GOOGLE_DRIVE_API_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/drive'],
  null
);

jwtClient.authorize((err) => {
  if (err) {
    console.error(err);
  }
});

const drive = google.drive('v3');

exports.add = params => new Promise((resolve, reject) => {
  const fileMetadata = {
    name: params.name,
    mimeType: params.folder ? 'application/vnd.google-apps.folder' : null,
    parents: [params.parentFolderId] || []
  };
  const media = params.folder ? null : { body: params.body, mimeType: params.type };
  drive.files.create({
    auth: jwtClient,
    resource: fileMetadata,
    media,
    fields: 'id'
  }, (err, item) => {
    if (err) {
      reject(err);
    } else {
      resolve(item.data);
    }
  });
});

exports.deleteFile = params => new Promise((resolve, reject) => {
  drive.files.delete({
    auth: jwtClient,
    fileId: params.fileId
  }, (err, file) => {
    if (err) {
      reject(err);
    } else {
      resolve(file.data);
    }
  });
});

exports.getFileById = params => new Promise((resolve, reject) => {
  drive.files.get({
    auth: jwtClient,
    fileId: `${params.fileId}`,
    //  pageSize: 10,
    fields: ['name, webViewLink, thumbnailLink']
  }, (err, response) => {
    if (err) {
      reject(new Error(`Google Drive API ${err}`));
    } else {
      resolve(response.data);
    }
  });
});

exports.downloadFileById = params => new Promise((resolve, reject) => {
  const dest = fs.createWriteStream(params.tmpFilePath);
  drive.files.get({
    auth: jwtClient,
    fileId: `${params.fileId}`,
    alt: 'media'
  }, { responseType: 'stream' }, (err, res) => {
    res.data.on('end', () => {
      console.log('Google drive doc downloaded successfully !');
      resolve();
    }).on('error', () => {
      reject(new Error(`Error during Google drive doc download ${err}`));
    }).pipe(dest);
  });
});
