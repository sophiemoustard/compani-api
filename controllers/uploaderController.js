const _ = require('lodash');

const translate = require('../helpers/translate');

const language = translate.language;

const drive = require('../models/Uploader/GoogleDrive');
const cloudinary = require('../models/Uploader/Cloudinary');

const createFolder = async (req, res) => {
  try {
    if (!req.body.parentFolderId || !req.body.folderName) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const payload = _.pick(req.body, ['parentFolderId', 'folderName']);
    const createdFolder = await drive.addFolder(payload);
    console.log(createdFolder);
    return res.status(200).json({ success: true, message: translate[language].folderCreated, data: { createdFolder } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const createFile = async (req, res) => {
  try {
    if (!req.body.parentFolderId || !req.body.fileName || !req.body.mimeType || !req.body.filePath) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const payload = _.pick(req.body, ['parentFolderId', 'fileName', 'mimeType', 'filePath']);
    const createdFile = await drive.addFile(payload);
    return res.status(200).json({ success: true, message: translate[language].fileCreated, data: { createdFile } });
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.error('File not found !');
      return res.status(404).json({ success: false, message: translate[language].fileNotFound });
    }
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.body.file || !req.body.folder) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const payload = _.pick(req.body, ['file', 'folder']);
    const uploadedImage = await cloudinary.addImage(payload);
    return res.status(200).json({ success: true, message: translate[language].fileCreated, data: { uploadedImage } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { createFolder, createFile, uploadImage };
