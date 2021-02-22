const Boom = require('@hapi/boom');
const Gdrive = require('../models/Google/Drive');

exports.addFile = async (params) => {
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
    name: typeof identity === 'string' ? identity : `${identity.lastname.toUpperCase()} ${identity.firstname || ''}`,
    parentFolderId,
    folder: true,
  });

  if (!folder) throw Boom.failedDependency('Google drive folder creation failed.');

  return folder;
};

exports.createFolderForCompany = async (companyName) => {
  const parentFolderId = process.env.GOOGLE_DRIVE_COMPANY_FOLDER_ID;
  const folder = await Gdrive.add({
    name: companyName,
    parentFolderId,
    folder: true,
  });

  if (!folder) throw Boom.failedDependency('Google drive folder creation failed.');

  return folder;
};

exports.deleteFile = async (driveFileId) => {
  try {
    if (process.env.NODE_ENV !== 'test') await Gdrive.deleteFile({ fileId: driveFileId });
  } catch (e) {
    console.error(e);

    if (e.toString().includes('The user does not have sufficient permissions for this file.')) return;
    if (e.toString().includes('File not found')) return;

    throw Boom.failedDependency('Google drive file deletion failed.');
  }
};
