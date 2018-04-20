const _ = require('lodash');
const flat = require('flat');

const translate = require('../helpers/translate');

const language = translate.language;

const drive = require('../models/Uploader/GoogleDrive');
const cloudinary = require('../models/Uploader/Cloudinary');
const User = require('../models/User');

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
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.body || !req.files || !req.params._id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const administrativeKeys = Object.keys(req.files);
    let driveFileInfo;
    try {
      driveFileInfo = await drive.getFileById({ fileId: req.files[administrativeKeys[0]][0].id });
    } catch (e) {
      console.error(e);
    }
    if (administrativeKeys[0] === 'certificates' || administrativeKeys[0] === 'idCard') {
      const key = administrativeKeys[0];
      let path = `administrative.${key}`;
      if (administrativeKeys[0] === 'certificates') {
        path = `administrative.${key}.docs`;
      }
      const payload = {
        [`${path}`]: {
          driveId: req.files[key][0].id,
          link: driveFileInfo.webViewLink
        }
      };
      await User.findOneAndUpdate({ _id: req.params._id }, { $push: payload }, { new: true });
    } else {
      const payload = {
        administrative: {
          [administrativeKeys[0]]: {
            driveId: req.files[administrativeKeys[0]][0].id,
            link: driveFileInfo.webViewLink
          }
        }
      };
      const user = await User.findById(req.params._id).lean();
      if (user.administrative && user.administrative[administrativeKeys[0]]) {
        const oldDocId = user.administrative[administrativeKeys[0]].driveId;
        try {
          await drive.deleteFile({ fileId: oldDocId });
        } catch (e) {
          console.error(e.response);
        }
      }
      await User.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true });
    }
    return res.status(200).json({ success: true, message: translate[language].fileCreated, data: req.files });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.body || !req.file || !req.params._id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const user = await User.findById(req.params._id).lean();
    if (user.picture && user.picture.publicId) {
      await cloudinary.deleteImage({ publicId: user.picture.publicId });
    }
    // const uploadedImage = req.file;
    const payload = {
      picture: {
        publicId: req.file.public_id,
        link: req.file.secure_url
      }
    };
    const userUpdated = await User.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true });
    return res.status(200).json({ success: true, message: translate[language].fileCreated, data: { picture: payload.picture, userUpdated } });
  } catch (e) {
    console.error(e);
    // if (e.cloudinary) {
    //   return res.status(e.http_code).json({ success: false, from: 'Cloudinary', message: e.message });
    // }
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { createFolder, uploadFile, uploadImage };
