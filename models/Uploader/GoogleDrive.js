const { google } = require('googleapis');

const jwtClient = new google.auth.JWT(
  process.env.GOOGLE_DRIVE_API_EMAIL,
  null,
  process.env.GOOGLE_DRIVE_API_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/drive.file'],
  null
);

jwtClient.authorize((err) => {
  if (err) {
    console.error(err);
  }
});

const drive = google.drive('v3');

exports.addFolder = params => new Promise((resolve, reject) => {
  const fileMetadata = {
    name: params.folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [params.parentFolderId] || []
  };
  drive.files.create({
    auth: jwtClient,
    resource: fileMetadata,
    fields: 'id'
  }, (err, folder) => {
    if (err) {
      reject(err);
    } else {
      resolve(folder.data);
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

// exports.addFile = params => new Promise((resolve, reject) => {
//   const fileMetadata = {
//     name: params.fileName,
//     parents: [params.parentFolderId] || []
//   };
//   const media = {
//     mimeType: params.type,
//     body: fs.createReadStream(params.file)
//   };
//   media.body.on('error', (err) => {
//     reject(err);
//   });
//   drive.files.create({
//     auth: jwtClient,
//     resource: fileMetadata,
//     media,
//     fields: 'id'
//   }, (err, file) => {
//     if (err) {
//       reject(err);
//     } else {
//       resolve(file.data);
//     }
//   });
// });
