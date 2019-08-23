const Boom = require('boom');
const Gdrive = require('../models/Google/Drive');

exports.addFile = async (params) => {
  console.log('MEH');
  const parentFolderId = params.driveFolderId;
  const uploadedFile = await Gdrive.add({
    name: params.name,
    parentFolderId,
    folder: false,
    type: params.type,
    body: params.body,
  });
  return uploadedFile;
};

exports.createFolder = async (identity, parentFolderId) => {
  const folder = await Gdrive.add({
    name: `${identity.lastname.toUpperCase()} ${identity.firstname || ''}`,
    parentFolderId,
    folder: true,
  });

  if (!folder) {
    throw Boom.failedDependency('Google drive folder creation failed.');
  }

  const folderLink = await Gdrive.getFileById({ fileId: folder.id });
  if (!folderLink) {
    throw Boom.notFound('Google drive folder not found.');
  }

  return { folder, folderLink };
};

exports.deleteFile = (driveFileId) => {
  if (process.env.NODE_ENV === 'test') return;
  return Gdrive.deleteFile({ fileId: driveFileId });
};
