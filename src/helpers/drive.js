const GdriveStorage = require('./gdriveStorage');

exports.uploadFile = async (driveId, docPayload) => {
  const uploadedFile = await GdriveStorage.addFile({
    driveFolderId: driveId,
    name: docPayload.fileName,
    type: docPayload['Content-Type'],
    body: docPayload.file,
  });

  return { attachment: { driveId: uploadedFile.id, link: uploadedFile.webViewLink } };
};
