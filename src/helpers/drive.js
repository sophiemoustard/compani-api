const GdriveStorage = require('./gdriveStorage');

exports.uploadFile = async (driveId, docKey, docPayload) => {
  const uploadedFile = await GdriveStorage.addFile({
    driveFolderId: driveId,
    name: docPayload.fileName,
    type: docPayload['Content-Type'],
    body: docPayload[docKey],
  });

  const fileInfo = { driveId: uploadedFile.id, link: uploadedFile.webViewLink };

  return { attachment: fileInfo };
};
