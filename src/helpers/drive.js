const path = require('path');
const os = require('os');
const GDriveStorageHelper = require('./gDriveStorage');
const drive = require('../models/Google/Drive');

exports.uploadFile = async (driveId, docPayload) => {
  const uploadedFile = await GDriveStorageHelper.addFile({
    driveFolderId: driveId,
    name: docPayload.fileName,
    type: docPayload['Content-Type'],
    body: docPayload.file,
  });

  return { attachment: { driveId: uploadedFile.id, link: uploadedFile.webViewLink } };
};

exports.downloadFile = async (driveId) => {
  const now = new Date();
  const filePath = path.join(os.tmpdir(), `download-${now.getTime()}`);
  const type = await drive.downloadFileById({ fileId: driveId, tmpFilePath: filePath });
  return { filePath, type };
};
