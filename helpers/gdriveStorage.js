const Gdrive = require('../models/GoogleDrive');

exports.handleFile = async (params) => {
  const parentFolderId = params.driveFolderId;
  const uploadedFile = await Gdrive.add({
    name: params.name,
    parentFolderId,
    folder: false,
    type: params.type,
    body: params.body
  });
  return uploadedFile;
};
