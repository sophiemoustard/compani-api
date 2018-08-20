const User = require('../models/User');
const Gdrive = require('../models/GoogleDrive');

exports.handleFile = async (params) => {
  const user = await User.findById(params._id).lean();
  if (!user.administrative.driveFolder) {
    throw new Error('No Google Drive folder !');
  }
  const parentFolderId = user.administrative.driveFolder.id;
  const uploadedFile = await Gdrive.add({
    name: params.name,
    parentFolderId,
    folder: false,
    type: params.type,
    body: params.body
  });
  return uploadedFile;
};
